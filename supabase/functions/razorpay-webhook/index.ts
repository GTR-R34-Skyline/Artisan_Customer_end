/**
 * Razorpay webhook receiver.
 * Platform JWT verification must be disabled (external Razorpay posts).
 * Signature is verified with RAZORPAY_WEBHOOK_SECRET.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  fetchRazorpayPayment,
  inrToPaise,
  isSuccessfulRazorpayPayment,
  mapRazorpayMethodToArtisan,
  razorpayOrderIdFromPayment,
  verifyWebhookSignature,
} from '../_shared/razorpay.ts';
import { sendSellerOrderEmail, isDeliverableEmail } from '../_shared/sellerEmail.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const toStringValue = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const webhookSecret = (Deno.env.get('RAZORPAY_WEBHOOK_SECRET') || '').trim();

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: 'Server configuration is incomplete.' }, 500);
    }
    if (!webhookSecret) {
      return json({ error: 'Webhook secret is not configured.' }, 500);
    }

    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';
    const ok = await verifyWebhookSignature({
      body: rawBody,
      signature,
      secret: webhookSecret,
    });
    if (!ok) {
      return json({ error: 'Invalid webhook signature.' }, 400);
    }

    const payload = asRecord(JSON.parse(rawBody || '{}'));
    const event = toStringValue(payload.event) || '';
    const entity = asRecord(asRecord(payload.payload).payment).entity
      || asRecord(asRecord(asRecord(payload.payload).payment).entity);

    // payment.captured is the primary fulfillment event for Checkout + auto-capture.
    if (event !== 'payment.captured' && event !== 'order.paid') {
      return json({ success: true, ignored: true, event });
    }

    const paymentEntity = event === 'order.paid'
      ? asRecord(asRecord(asRecord(payload.payload).order).entity)
      : asRecord(entity);

    let razorpayPaymentId = toStringValue(paymentEntity.id);
    let razorpayOrderId = toStringValue(paymentEntity.order_id);

    if (event === 'order.paid') {
      razorpayOrderId = toStringValue(paymentEntity.id);
      // Prefer nested payment id when present; otherwise skip until payment.captured.
      const paymentsCollection = asRecord(paymentEntity.payments);
      const items = Array.isArray(paymentsCollection.items) ? paymentsCollection.items : [];
      const firstPayment = items.length ? asRecord(items[0]) : {};
      razorpayPaymentId = toStringValue(firstPayment.id);
      if (!razorpayPaymentId) {
        return json({ success: true, ignored: true, reason: 'order.paid without payment id' });
      }
    }

    if (!razorpayPaymentId || !razorpayOrderId) {
      return json({ error: 'Webhook payload missing payment/order id.' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: paymentRows, error: paymentLookupError } = await admin
      .from('payments')
      .select('id, order_id, buyer_id, status, amount, upi_app, transaction_id')
      .eq('upi_app', razorpayOrderId)
      .limit(1);
    if (paymentLookupError) throw paymentLookupError;

    const paymentRow = (paymentRows || []).map(asRecord)[0];
    if (!paymentRow) {
      return json({ success: true, ignored: true, reason: 'no matching ARTISAN payment' });
    }

    const orderId = toStringValue(paymentRow.order_id);
    const buyerId = toStringValue(paymentRow.buyer_id);
    if (!orderId || !buyerId) {
      return json({ error: 'Payment linkage incomplete.' }, 400);
    }

    if (
      toStringValue(paymentRow.status)?.toLowerCase() === 'success'
      && toStringValue(paymentRow.transaction_id) === razorpayPaymentId
    ) {
      return json({ success: true, idempotent: true });
    }

    const linkedOrderId = razorpayOrderIdFromPayment(paymentRow.upi_app);
    if (linkedOrderId !== razorpayOrderId) {
      return json({ error: 'Razorpay order mismatch.' }, 400);
    }

    console.info('[razorpay-webhook] event', {
      event,
      razorpayPaymentId,
      razorpayOrderId,
      orderId,
      buyerId,
    });

    const rzPayment = await fetchRazorpayPayment(razorpayPaymentId);
    console.info('[razorpay-webhook] razorpay payment fetched', {
      orderId,
      razorpayPaymentId: rzPayment.id,
      razorpayOrderId: rzPayment.order_id,
      status: rzPayment.status,
      amount: rzPayment.amount,
      currency: rzPayment.currency,
      method: rzPayment.method || null,
      captured: Boolean(rzPayment.captured),
    });
    if (rzPayment.order_id !== razorpayOrderId) {
      return json({ error: 'Payment/order mismatch.' }, 400);
    }
    if (rzPayment.currency.toUpperCase() !== 'INR') {
      return json({ error: 'Unexpected currency.' }, 400);
    }
    const expectedPaise = inrToPaise(toNumber(paymentRow.amount));
    if (rzPayment.amount !== expectedPaise) {
      return json({ error: 'Amount mismatch.' }, 400);
    }
    if (!isSuccessfulRazorpayPayment(rzPayment)) {
      return json({ success: true, ignored: true, reason: 'payment not captured' });
    }

    // Sole order/payment mutation for webhook capture.
    // RPC sets confirmed — this function must NEVER set orders.status (esp. delivered).
    const { data: finalizeData, error: finalizeError } = await admin.rpc('finalize_mock_upi_payment', {
      p_order_id: orderId,
      p_buyer_id: buyerId,
      p_outcome: 'success',
      p_upi_app: razorpayOrderId,
      p_upi_id: null,
      p_transaction_id: razorpayPaymentId,
    });
    if (finalizeError) {
      return json({ error: finalizeError.message || 'Finalize failed.' }, 400);
    }

    // payments metadata only — no orders.status write.
    await admin
      .from('payments')
      .update({
        payment_method: mapRazorpayMethodToArtisan(rzPayment.method),
        upi_app: razorpayOrderId,
        transaction_id: razorpayPaymentId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', toStringValue(paymentRow.id) || '');

    const result = asRecord(finalizeData);
    const alreadyDone = Boolean(result.idempotent);
    const rpcOrderStatus = (toStringValue(result.order_status) || 'confirmed').toLowerCase();

    if (!alreadyDone && rpcOrderStatus === 'delivered') {
      console.error('[razorpay-webhook] unexpected_delivered_after_payment', {
        orderId,
        razorpayPaymentId,
        rpcOrderStatus,
        note: 'finalize_mock_upi_payment must return confirmed, not delivered. Webhook did not update orders.status.',
      });
    }

    console.info('[razorpay-webhook] finalize done', {
      orderId,
      razorpayPaymentId,
      paymentStatus: toStringValue(result.payment_status),
      orderStatus: toStringValue(result.order_status),
      stockDeducted: Boolean(result.stock_deducted),
      idempotent: alreadyDone,
    });

    if (!alreadyDone) {
      try {
        const { data: items } = await admin
          .from('order_items')
          .select('vendor_id, product_id, quantity, unit_price, subtotal')
          .eq('order_id', orderId);
        const vendorIds = Array.from(
          new Set(
            (items || [])
              .map((row) => toStringValue(asRecord(row).vendor_id))
              .filter((id): id is string => Boolean(id)),
          ),
        );
        const notifyOrderStatus =
          rpcOrderStatus === 'delivered'
            ? 'confirmed'
            : (toStringValue(result.order_status) || 'confirmed');
        for (const vendorId of vendorIds) {
          const { data: authUser } = await admin.auth.admin.getUserById(vendorId);
          const email = toStringValue(authUser.user?.email);
          if (!isDeliverableEmail(email)) continue;
          const { data: profile } = await admin
            .from('profiles')
            .select('full_name')
            .eq('id', vendorId)
            .maybeSingle();
          await sendSellerOrderEmail({
            to: email!,
            sellerName: toStringValue(asRecord(profile).full_name) || 'Seller',
            orderId,
            orderStatus: notifyOrderStatus,
            orderDate: new Date().toISOString(),
            lines: (items || [])
              .map(asRecord)
              .filter((row) => toStringValue(row.vendor_id) === vendorId)
              .map((row) => ({
                productName: 'Product',
                quantity: Math.max(1, toNumber(row.quantity)),
                unitPrice: toNumber(row.unit_price),
                subtotal: toNumber(row.subtotal) || toNumber(row.unit_price) * Math.max(1, toNumber(row.quantity)),
              })),
            idempotencyKey: `seller-email:${orderId}:${vendorId}`,
          });
        }
      } catch (notifyError) {
        console.error('[razorpay-webhook] seller notify failed', notifyError);
      }
    }

    return json({ success: true, result });
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : 'Webhook processing failed.',
    }, 500);
  }
});
