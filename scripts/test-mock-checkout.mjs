/**
 * Integration checks for Razorpay checkout scaffolding.
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
 * Optional: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET configured on Edge Functions
 * for create_razorpay_order coverage.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const DEMO_PASSWORD = 'Demo@12345';

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const results = [];

const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name} — ${detail}`);
};

async function signIn(email) {
  const client = createClient(url, key);
  const { error } = await client.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`);
  return client;
}

async function invokeCheckout(client, body) {
  const { data, error } = await client.functions.invoke('marketplace-checkout', { body });
  if (error) {
    let message = error.message;
    if (error.context instanceof Response) {
      try {
        const payload = await error.context.json();
        message = payload.error || payload.message || message;
      } catch {
        // ignore
      }
    }
    throw new Error(message);
  }
  if (!data?.success) throw new Error(data?.error || 'Checkout call failed.');
  return data;
}

async function findPurchasableProduct(client) {
  const { data, error } = await client
    .from('products')
    .select('id, vendor_id, title, title_en, final_price, suggested_price, quantity, stock_count, status')
    .in('status', ['approved', 'published', 'synced'])
    .gt('stock_count', 0)
    .limit(20);
  if (error) throw error;
  const candidate = (data || []).find((row) => (row.stock_count ?? row.quantity ?? 0) > 0 && (row.final_price ?? row.suggested_price));
  if (!candidate) throw new Error('No purchasable product found.');
  return candidate;
}

async function main() {
  const buyer = await signIn('neha.patel@demo.artisan.market');
  const product = await findPurchasableProduct(buyer);
  const initialStock = product.stock_count ?? product.quantity ?? 0;
  const unitPrice = product.final_price ?? product.suggested_price;
  const idempotencyKey = `test-rzp-${Date.now()}`;

  const created = await invokeCheckout(buyer, {
    action: 'create_order',
    items: [{ productId: product.id, quantity: 1 }],
    shippingAddress: 'Neha Patel, 12 Demo Lane, Bengaluru, Karnataka 560001',
    idempotencyKey,
  });

  const orderId = created.order.id;
  const paymentId = created.payment.id;
  record('create order + pending payment', Boolean(orderId && paymentId), `${orderId} / ${paymentId}`);
  record(
    'payment method is upi pending (Razorpay is gateway, not method)',
    created.payment.payment_method === 'upi' && created.payment.status === 'pending',
    `${created.payment.payment_method}/${created.payment.status}`,
  );

  const duplicate = await invokeCheckout(buyer, {
    action: 'create_order',
    items: [{ productId: product.id, quantity: 1 }],
    shippingAddress: 'Neha Patel, 12 Demo Lane, Bengaluru, Karnataka 560001',
    idempotencyKey,
  });
  record('idempotent order creation', duplicate.idempotent === true && duplicate.order.id === orderId, duplicate.order.id);

  const mockBlocked = await invokeCheckout(buyer, {
    action: 'process_payment',
    orderId,
    mockOutcome: 'success',
  }).catch((error) => ({ error: error.message }));
  record(
    'mock process_payment is disabled',
    Boolean(mockBlocked.error),
    mockBlocked.error || 'unexpectedly succeeded',
  );

  try {
    const session = await invokeCheckout(buyer, {
      action: 'create_razorpay_order',
      orderId,
    });
    record(
      'create_razorpay_order returns session',
      Boolean(session.keyId && session.razorpayOrderId && session.amountPaise > 0),
      `${session.razorpayOrderId} / ${session.amountPaise} paise`,
    );
    record(
      'razorpay amount matches order total in paise',
      Number(session.amountPaise) === Math.round(Number(unitPrice) * 100),
      `${session.amountPaise} vs ${Math.round(Number(unitPrice) * 100)}`,
    );

    const again = await invokeCheckout(buyer, {
      action: 'create_razorpay_order',
      orderId,
    });
    record(
      'create_razorpay_order reuses existing Razorpay order',
      again.razorpayOrderId === session.razorpayOrderId,
      again.razorpayOrderId,
    );
  } catch (error) {
    record(
      'create_razorpay_order available when secrets configured',
      false,
      error instanceof Error ? error.message : String(error),
    );
  }

  const { data: afterCreateProduct } = await buyer.from('products').select('stock_count, quantity').eq('id', product.id).single();
  record(
    'creating razorpay session does not reduce stock',
    (afterCreateProduct?.stock_count ?? afterCreateProduct?.quantity) === initialStock,
    `stock ${afterCreateProduct?.stock_count ?? afterCreateProduct?.quantity}`,
  );

  await buyer.auth.signOut();

  const failed = results.filter((result) => !result.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    failed.forEach((result) => console.error(`  - ${result.name}: ${result.detail}`));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
