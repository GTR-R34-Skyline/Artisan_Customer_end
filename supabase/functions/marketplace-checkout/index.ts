import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendSellerOrderEmail, isDeliverableEmail } from '../_shared/sellerEmail.ts';
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  getRazorpayCredentials,
  inrToPaise,
  isSuccessfulRazorpayPayment,
  mapRazorpayMethodToArtisan,
  razorpayOrderIdFromPayment,
  verifyCheckoutSignature,
} from '../_shared/razorpay.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
};

const PUBLIC_STATUSES = new Set(['approved', 'published', 'synced']);

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

const productStock = (row: Record<string, unknown>): number =>
  Math.max(0, toNumber(row.stock_count ?? row.quantity));

const readError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return 'Checkout request failed.';
};

const productPrice = (row: Record<string, unknown>): number => {
  const finalPrice = row.final_price;
  const suggested = row.suggested_price;
  if (finalPrice !== null && finalPrice !== undefined) return Math.max(0, toNumber(finalPrice));
  return Math.max(0, toNumber(suggested));
};

const notifySellersForPaidOrder = async (
  admin: SupabaseClient,
  orderId: string,
  orderStatus: string,
): Promise<void> => {
  try {
    const { data: items, error: itemsError } = await admin
      .from('order_items')
      .select('product_id, vendor_id, quantity, unit_price, subtotal')
      .eq('order_id', orderId);
    if (itemsError) throw itemsError;

    const rows = (items || []).map(asRecord);
    const vendorIds = Array.from(
      new Set(rows.map((row) => toStringValue(row.vendor_id)).filter((id): id is string => Boolean(id))),
    );
    if (!vendorIds.length) return;

    const productIds = Array.from(
      new Set(rows.map((row) => toStringValue(row.product_id)).filter((id): id is string => Boolean(id))),
    );
    const productsById = new Map<string, Record<string, unknown>>();
    if (productIds.length) {
      const { data: products } = await admin
        .from('products')
        .select('id, title, title_en')
        .in('id', productIds);
      (products || []).forEach((row) => {
        const record = asRecord(row);
        const id = toStringValue(record.id);
        if (id) productsById.set(id, record);
      });
    }

    const { data: profiles } = await admin
      .from('profiles')
      .select('id, full_name, phone_number')
      .in('id', vendorIds);

    for (const vendorId of vendorIds) {
      const profile = (profiles || []).map(asRecord).find((row) => toStringValue(row.id) === vendorId);
      let email: string | null = null;

      try {
        const { data: authUser } = await admin.auth.admin.getUserById(vendorId);
        email = toStringValue(authUser.user?.email);
      } catch {
        // Auth lookup is best-effort.
      }

      if (!isDeliverableEmail(email)) {
        console.warn('[seller-email] skipped_no_deliverable_email', { orderId, vendorId });
        continue;
      }

      const vendorLines = rows
        .filter((row) => toStringValue(row.vendor_id) === vendorId)
        .map((row) => {
          const productId = toStringValue(row.product_id) || '';
          const product = productsById.get(productId);
          const quantity = Math.max(1, toNumber(row.quantity));
          const unitPrice = toNumber(row.unit_price);
          return {
            productName: toStringValue(product?.title_en) || toStringValue(product?.title) || 'Product',
            quantity,
            unitPrice,
            subtotal: toNumber(row.subtotal) || unitPrice * quantity,
          };
        });

      await sendSellerOrderEmail({
        to: email!,
        sellerName: toStringValue(profile?.full_name) || 'Seller',
        orderId,
        orderStatus,
        orderDate: new Date().toISOString(),
        lines: vendorLines,
        idempotencyKey: `seller-email:${orderId}:${vendorId}`,
      });
    }
  } catch (error) {
    console.error('[seller-email] notify_failed', {
      orderId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

const finalizeVerifiedRazorpayPayment = async (
  admin: SupabaseClient,
  input: {
    orderId: string;
    buyerId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    methodLabel?: string | null;
  },
): Promise<Record<string, unknown>> => {
  const { data, error } = await admin.rpc('finalize_mock_upi_payment', {
    p_order_id: input.orderId,
    p_buyer_id: input.buyerId,
    p_outcome: 'success',
    p_upi_app: input.razorpayOrderId,
    p_upi_id: null,
    p_transaction_id: input.razorpayPaymentId,
  });

  if (error) {
    throw new Error(error.message || 'Payment could not be finalized.');
  }

  const result = asRecord(data);
  const alreadyDone = Boolean(result.idempotent);

  // Existing RPC forces payment_method='upi'. Keep an allowed ARTISAN method only.
  // Store Razorpay payment id in transaction_id; Razorpay order id remains in upi_app.
  const artisanMethod = mapRazorpayMethodToArtisan(input.methodLabel);
  await admin
    .from('payments')
    .update({
      payment_method: artisanMethod,
      upi_app: input.razorpayOrderId,
      transaction_id: input.razorpayPaymentId,
      updated_at: new Date().toISOString(),
    })
    .eq('order_id', input.orderId)
    .eq('buyer_id', input.buyerId);

  if (!alreadyDone) {
    await notifySellersForPaidOrder(
      admin,
      input.orderId,
      toStringValue(result.order_status) || 'delivered',
    );
  }

  return {
    ...result,
    payment_method: artisanMethod,
    razorpay_order_id: input.razorpayOrderId,
    razorpay_payment_id: input.razorpayPaymentId,
    method: input.methodLabel || null,
  };
};

interface CartItemInput {
  productId: string;
  quantity: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const authorization = req.headers.get('Authorization') || '';

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: 'Server configuration is incomplete.' }, 500);
    }

    if (!authorization) {
      return json({ error: 'Missing authorization.' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    const userId = userData.user?.id;
    if (userError || !userId) {
      return json({ error: 'Invalid session.' }, 401);
    }

    const body = asRecord(await req.json());
    const action = toStringValue(body.action);
    const admin = createClient(supabaseUrl, serviceRoleKey);

    if (action === 'create_order') {
      const itemsRaw = Array.isArray(body.items) ? body.items : [];
      const items: CartItemInput[] = itemsRaw
        .map((item) => asRecord(item))
        .map((item) => ({
          productId: toStringValue(item.productId) || toStringValue(item.product_id) || '',
          quantity: Math.max(1, Math.min(99, Math.round(toNumber(item.quantity)))),
        }))
        .filter((item) => item.productId);

      if (!items.length) {
        return json({ error: 'Your collection is empty.' }, 400);
      }

      const shippingAddress = toStringValue(body.shippingAddress) || toStringValue(body.shipping_address);
      if (!shippingAddress || shippingAddress.length < 8) {
        return json({ error: 'Please provide a delivery address.' }, 400);
      }

      const idempotencyKey = toStringValue(body.idempotencyKey) || toStringValue(body.idempotency_key);
      if (idempotencyKey) {
        const { data: existingOrder } = await admin
          .from('orders')
          .select('id, status, total_amount, stock_deducted, checkout_idempotency_key')
          .eq('buyer_id', userId)
          .eq('checkout_idempotency_key', idempotencyKey)
          .maybeSingle();

        if (existingOrder?.id) {
          const { data: payment } = await admin
            .from('payments')
            .select('id, status, amount, transaction_id, upi_app, payment_method')
            .eq('order_id', existingOrder.id)
            .maybeSingle();

          return json({
            success: true,
            idempotent: true,
            order: existingOrder,
            payment,
          });
        }
      }

      const productIds = items.map((item) => item.productId);
      const { data: productRows, error: productError } = await admin
        .from('products')
        .select('id, vendor_id, title, title_en, final_price, suggested_price, quantity, stock_count, status')
        .in('id', productIds);

      if (productError) throw productError;

      const productsById = new Map(
        (productRows || []).map((row) => [toStringValue(asRecord(row).id) || '', asRecord(row)]),
      );

      let totalAmount = 0;
      const orderItemsPayload: Record<string, unknown>[] = [];

      for (const item of items) {
        const product = productsById.get(item.productId);
        if (!product) {
          return json({ error: 'One of the selected pieces is no longer available.' }, 400);
        }

        const status = toStringValue(product.status) || '';
        if (!PUBLIC_STATUSES.has(status)) {
          return json({ error: 'One of the selected pieces is no longer listed.' }, 400);
        }

        const available = productStock(product);
        if (available < item.quantity) {
          return json({ error: 'One of the selected pieces does not have enough stock.' }, 400);
        }

        const unitPrice = productPrice(product);
        if (unitPrice <= 0) {
          return json({ error: 'One of the selected pieces cannot be purchased yet.' }, 400);
        }

        const subtotal = unitPrice * item.quantity;
        totalAmount += subtotal;
        orderItemsPayload.push({
          product_id: item.productId,
          vendor_id: toStringValue(product.vendor_id),
          quantity: item.quantity,
          unit_price: unitPrice,
        });
      }

      const { data: order, error: orderError } = await admin
        .from('orders')
        .insert({
          buyer_id: userId,
          total_amount: totalAmount,
          status: 'processing',
          shipping_address: shippingAddress,
          checkout_idempotency_key: idempotencyKey,
          stock_deducted: false,
        })
        .select('id, status, total_amount, shipping_address, stock_deducted, created_at')
        .single();

      if (orderError) {
        if (orderError.code === '23505' && idempotencyKey) {
          const { data: existingOrder } = await admin
            .from('orders')
            .select('id, status, total_amount, stock_deducted')
            .eq('buyer_id', userId)
            .eq('checkout_idempotency_key', idempotencyKey)
            .maybeSingle();
          const { data: payment } = existingOrder?.id
            ? await admin.from('payments').select('*').eq('order_id', existingOrder.id).maybeSingle()
            : { data: null };
          return json({ success: true, idempotent: true, order: existingOrder, payment });
        }
        throw orderError;
      }

      const orderId = toStringValue(asRecord(order).id);
      if (!orderId) throw new Error('Order could not be created.');

      const { error: itemsError } = await admin.from('order_items').insert(
        orderItemsPayload.map((item) => ({ ...item, order_id: orderId })),
      );
      if (itemsError) throw itemsError;

      const { data: payment, error: paymentError } = await admin
        .from('payments')
        .insert({
          order_id: orderId,
          buyer_id: userId,
          payment_method: 'upi',
          upi_app: null,
          transaction_id: null,
          amount: totalAmount,
          status: 'pending',
        })
        .select('id, status, amount, transaction_id, payment_method, upi_app')
        .single();

      if (paymentError) throw paymentError;

      return json({ success: true, order, payment });
    }

    if (action === 'list_orders') {
      const { data: orders, error: ordersError } = await admin
        .from('orders')
        .select('id, buyer_id, status, total_amount, shipping_address, stock_deducted, created_at, updated_at')
        .eq('buyer_id', userId)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      const orderRows = (orders || []).map(asRecord);
      const orderIds = orderRows.map((row) => toStringValue(row.id)).filter((id): id is string => Boolean(id));

      if (!orderIds.length) {
        return json({ success: true, orders: [] });
      }

      const [{ data: items, error: itemsError }, { data: payments, error: paymentsError }] = await Promise.all([
        admin.from('order_items').select('id, order_id, product_id, vendor_id, quantity, unit_price, subtotal').in('order_id', orderIds),
        admin.from('payments').select('id, order_id, status, amount, transaction_id, upi_app, payment_method, created_at, updated_at').in('order_id', orderIds),
      ]);

      if (itemsError) throw itemsError;
      if (paymentsError) throw paymentsError;

      const itemRows = (items || []).map(asRecord);
      const productIds = Array.from(new Set(itemRows.map((row) => toStringValue(row.product_id)).filter((id): id is string => Boolean(id))));
      let products: Record<string, unknown>[] = [];
      if (productIds.length) {
        const { data: productRows, error: productsError } = await admin
          .from('products')
          .select('id, title, title_en, original_image_url, studio_image_url, enhanced_image_url')
          .in('id', productIds);
        if (productsError) throw productsError;
        products = (productRows || []).map(asRecord);
      }

      return json({
        success: true,
        orders: orderRows,
        items: itemRows,
        payments: (payments || []).map(asRecord),
        products,
      });
    }

    if (action === 'get_checkout') {
      const orderId = toStringValue(body.orderId) || toStringValue(body.order_id);
      if (!orderId) return json({ error: 'Order id is required.' }, 400);

      const { data: order, error: orderError } = await admin
        .from('orders')
        .select('id, buyer_id, status, total_amount, shipping_address, stock_deducted, created_at, updated_at')
        .eq('id', orderId)
        .maybeSingle();

      if (orderError) throw orderError;
      if (!order || asRecord(order).buyer_id !== userId) {
        return json({ error: 'Order not found.' }, 404);
      }

      const [{ data: items, error: itemsError }, { data: payment, error: paymentError }] = await Promise.all([
        admin.from('order_items').select('id, product_id, vendor_id, quantity, unit_price, subtotal').eq('order_id', orderId),
        admin.from('payments').select('id, status, amount, transaction_id, upi_app, payment_method, created_at, updated_at').eq('order_id', orderId).maybeSingle(),
      ]);

      if (itemsError) throw itemsError;
      if (paymentError) throw paymentError;

      const productIds = (items || [])
        .map((row) => toStringValue(asRecord(row).product_id))
        .filter((id): id is string => Boolean(id));

      let products: Record<string, unknown>[] = [];
      if (productIds.length) {
        const { data: productRows, error: productsError } = await admin
          .from('products')
          .select('id, title, title_en, original_image_url, studio_image_url, enhanced_image_url')
          .in('id', productIds);
        if (productsError) throw productsError;
        products = (productRows || []).map(asRecord);
      }

      return json({ success: true, order, items: items || [], payment, products });
    }

    if (action === 'create_razorpay_order') {
      const orderId = toStringValue(body.orderId) || toStringValue(body.order_id);
      if (!orderId) return json({ error: 'Order id is required.' }, 400);

      const { keyId } = getRazorpayCredentials();

      const { data: order, error: orderError } = await admin
        .from('orders')
        .select('id, buyer_id, status, total_amount, stock_deducted')
        .eq('id', orderId)
        .maybeSingle();
      if (orderError) throw orderError;
      if (!order || asRecord(order).buyer_id !== userId) {
        return json({ error: 'Order not found.' }, 404);
      }

      const orderRow = asRecord(order);
      if (Boolean(orderRow.stock_deducted)) {
        return json({ error: 'This order has already been fulfilled.' }, 400);
      }

      const { data: payment, error: paymentError } = await admin
        .from('payments')
        .select('id, status, amount, transaction_id, upi_app, payment_method')
        .eq('order_id', orderId)
        .maybeSingle();
      if (paymentError) throw paymentError;
      if (!payment) return json({ error: 'Payment record not found.' }, 404);

      const paymentRow = asRecord(payment);
      if (toStringValue(paymentRow.status)?.toLowerCase() === 'success') {
        return json({ error: 'This order is already paid.' }, 400);
      }

      const amountInr = toNumber(paymentRow.amount ?? orderRow.total_amount);
      if (amountInr <= 0) return json({ error: 'Invalid order amount.' }, 400);
      const amountPaise = inrToPaise(amountInr);

      const existingRazorpayOrderId = razorpayOrderIdFromPayment(paymentRow.upi_app);
      let razorpayOrderId = existingRazorpayOrderId;

      if (!razorpayOrderId) {
        const created = await createRazorpayOrder({
          amountPaise,
          receipt: orderId,
          notes: {
            artisan_order_id: orderId,
            artisan_buyer_id: userId,
          },
        });
        if (!created.id) throw new Error('Razorpay order id missing.');
        if (created.amount !== amountPaise || created.currency.toUpperCase() !== 'INR') {
          return json({ error: 'Razorpay order amount mismatch.' }, 500);
        }
        razorpayOrderId = created.id;

        const { error: updateError } = await admin
          .from('payments')
          .update({
            payment_method: 'upi',
            upi_app: razorpayOrderId,
            status: 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('id', toStringValue(paymentRow.id) || '')
          .eq('order_id', orderId);
        if (updateError) throw updateError;
      }

      let buyerName: string | null = null;
      let buyerEmail: string | null = null;
      let buyerPhone: string | null = null;
      try {
        const { data: profile } = await admin
          .from('profiles')
          .select('full_name, phone_number')
          .eq('id', userId)
          .maybeSingle();
        const profileRow = asRecord(profile);
        buyerName = toStringValue(profileRow.full_name);
        buyerPhone = toStringValue(profileRow.phone_number);
      } catch {
        // Prefill is optional.
      }
      try {
        const { data: authUser } = await admin.auth.admin.getUserById(userId);
        buyerEmail = toStringValue(authUser.user?.email);
        buyerPhone = buyerPhone || toStringValue(authUser.user?.phone);
        if (!buyerName) {
          const meta = asRecord(authUser.user?.user_metadata);
          buyerName = toStringValue(meta.full_name) || toStringValue(meta.name);
        }
      } catch {
        // Optional.
      }

      return json({
        success: true,
        keyId,
        razorpayOrderId,
        amountPaise,
        currency: 'INR',
        orderId,
        amountInr,
        prefill: {
          name: buyerName,
          email: buyerEmail,
          contact: buyerPhone,
        },
      });
    }

    if (action === 'verify_razorpay_payment') {
      const orderId = toStringValue(body.orderId) || toStringValue(body.order_id);
      const razorpayOrderId = toStringValue(body.razorpayOrderId) || toStringValue(body.razorpay_order_id);
      const razorpayPaymentId = toStringValue(body.razorpayPaymentId) || toStringValue(body.razorpay_payment_id);
      const razorpaySignature = toStringValue(body.razorpaySignature) || toStringValue(body.razorpay_signature);

      if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return json({ error: 'Payment verification details are incomplete.' }, 400);
      }

      const { keySecret } = getRazorpayCredentials();

      const { data: order, error: orderError } = await admin
        .from('orders')
        .select('id, buyer_id, status, total_amount, stock_deducted')
        .eq('id', orderId)
        .maybeSingle();
      if (orderError) throw orderError;
      if (!order || asRecord(order).buyer_id !== userId) {
        return json({ error: 'Order not found.' }, 404);
      }

      const { data: payment, error: paymentError } = await admin
        .from('payments')
        .select('id, status, amount, transaction_id, upi_app, payment_method')
        .eq('order_id', orderId)
        .maybeSingle();
      if (paymentError) throw paymentError;
      if (!payment) return json({ error: 'Payment record not found.' }, 404);

      const paymentRow = asRecord(payment);
      const orderRow = asRecord(order);
      const expectedOrderId = razorpayOrderIdFromPayment(paymentRow.upi_app);

      if (!expectedOrderId) {
        return json({ error: 'No Razorpay order is linked to this checkout.' }, 400);
      }
      if (expectedOrderId !== razorpayOrderId) {
        return json({ error: 'Razorpay order does not match this ARTISAN order.' }, 400);
      }

      // Idempotent: already paid with same Razorpay payment id.
      if (
        toStringValue(paymentRow.status)?.toLowerCase() === 'success'
        && toStringValue(paymentRow.transaction_id) === razorpayPaymentId
      ) {
        return json({
          success: true,
          result: {
            idempotent: true,
            order_id: orderId,
            order_status: orderRow.status,
            payment_status: 'success',
            transaction_id: razorpayPaymentId,
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: razorpayPaymentId,
            stock_deducted: orderRow.stock_deducted,
          },
        });
      }

      const signatureOk = await verifyCheckoutSignature({
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        keySecret,
      });
      if (!signatureOk) {
        return json({ error: 'Payment signature verification failed.' }, 400);
      }

      const rzPayment = await fetchRazorpayPayment(razorpayPaymentId);
      if (rzPayment.order_id !== razorpayOrderId) {
        return json({ error: 'Razorpay payment does not belong to this order.' }, 400);
      }
      if (rzPayment.currency.toUpperCase() !== 'INR') {
        return json({ error: 'Unexpected payment currency.' }, 400);
      }

      const expectedPaise = inrToPaise(toNumber(paymentRow.amount ?? orderRow.total_amount));
      if (rzPayment.amount !== expectedPaise) {
        return json({ error: 'Paid amount does not match the order total.' }, 400);
      }
      if (!isSuccessfulRazorpayPayment(rzPayment)) {
        return json({ error: 'Payment is not captured yet.' }, 400);
      }

      const result = await finalizeVerifiedRazorpayPayment(admin, {
        orderId,
        buyerId: userId,
        razorpayOrderId,
        razorpayPaymentId,
        methodLabel: rzPayment.method,
      });

      return json({ success: true, result });
    }

    if (action === 'mark_razorpay_failed') {
      const orderId = toStringValue(body.orderId) || toStringValue(body.order_id);
      if (!orderId) return json({ error: 'Order id is required.' }, 400);

      const { data, error } = await admin.rpc('finalize_mock_upi_payment', {
        p_order_id: orderId,
        p_buyer_id: userId,
        p_outcome: 'failed',
        p_upi_app: null,
        p_upi_id: null,
        p_transaction_id: null,
      });
      if (error) {
        return json({ error: error.message || 'Payment could not be marked failed.' }, 400);
      }

      // Keep allowed ARTISAN payment_method values only (never 'razorpay').
      await admin
        .from('payments')
        .update({ payment_method: 'upi', updated_at: new Date().toISOString() })
        .eq('order_id', orderId)
        .eq('buyer_id', userId);

      return json({ success: true, result: data });
    }

    if (action === 'process_payment') {
      return json({
        error: 'Mock UPI payment has been replaced by Razorpay. Use verify_razorpay_payment.',
      }, 410);
    }

    if (action === 'retry_payment') {
      const orderId = toStringValue(body.orderId) || toStringValue(body.order_id);
      if (!orderId) return json({ error: 'Order id is required.' }, 400);

      const { data, error } = await admin.rpc('reset_mock_payment_for_retry', {
        p_order_id: orderId,
        p_buyer_id: userId,
      });

      if (error) {
        return json({ error: error.message || 'Payment could not be reset.' }, 400);
      }

      // Clear previous Razorpay order link so a fresh Razorpay order can be created.
      await admin
        .from('payments')
        .update({
          payment_method: 'upi',
          upi_app: null,
          transaction_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('order_id', orderId)
        .eq('buyer_id', userId)
        .neq('status', 'success');

      return json({ success: true, result: data });
    }

    // Buyer tracking read path — verifies order ownership, then returns that buyer's shipments.
    if (action === 'list_order_shipments') {
      const orderId = toStringValue(body.orderId) || toStringValue(body.order_id);
      if (!orderId) return json({ error: 'Order id is required.' }, 400);

      const { data: order, error: orderError } = await admin
        .from('orders')
        .select('id, buyer_id')
        .eq('id', orderId)
        .maybeSingle();
      if (orderError) throw orderError;
      if (!order || asRecord(order).buyer_id !== userId) {
        return json({ error: 'Order not found.' }, 404);
      }

      const { data: shipmentRows, error: shipmentError } = await admin
        .from('shipments')
        .select(
          'id, order_id, vendor_id, buyer_id, courier_id, carrier, tracking_number, status, origin, destination, estimated_delivery_date, dispatched_at, picked_up_at, delivered_at, created_at, updated_at',
        )
        .eq('order_id', orderId)
        .eq('buyer_id', userId)
        .order('created_at', { ascending: true });
      if (shipmentError) throw shipmentError;

      const shipments = (shipmentRows || []).map(asRecord);
      const shipmentIds = shipments
        .map((row) => toStringValue(row.id))
        .filter((id): id is string => Boolean(id));

      let events: Record<string, unknown>[] = [];
      if (shipmentIds.length) {
        const { data: eventRows, error: eventsError } = await admin
          .from('shipment_events')
          .select('id, shipment_id, status, location, description, actor_type, actor_id, event_time, created_at')
          .in('shipment_id', shipmentIds)
          .order('event_time', { ascending: true });
        if (eventsError) throw eventsError;
        events = (eventRows || []).map(asRecord);
      }

      return json({ success: true, shipments, events });
    }

    if (action === 'list_shipment_summaries') {
      const orderIdsRaw = Array.isArray(body.orderIds)
        ? body.orderIds
        : Array.isArray(body.order_ids)
          ? body.order_ids
          : [];
      const orderIds = orderIdsRaw
        .map((value) => toStringValue(value))
        .filter((id): id is string => Boolean(id));
      if (!orderIds.length) {
        return json({ success: true, shipments: [] });
      }

      const { data: ownedOrders, error: ownedError } = await admin
        .from('orders')
        .select('id')
        .eq('buyer_id', userId)
        .in('id', orderIds);
      if (ownedError) throw ownedError;

      const ownedIds = (ownedOrders || [])
        .map((row) => toStringValue(asRecord(row).id))
        .filter((id): id is string => Boolean(id));
      if (!ownedIds.length) {
        return json({ success: true, shipments: [] });
      }

      const { data: shipmentRows, error: shipmentError } = await admin
        .from('shipments')
        .select('order_id, status, created_at, buyer_id')
        .eq('buyer_id', userId)
        .in('order_id', ownedIds)
        .order('created_at', { ascending: false });
      if (shipmentError) throw shipmentError;

      return json({ success: true, shipments: (shipmentRows || []).map(asRecord) });
    }

    return json({ error: 'Unsupported action.' }, 400);
  } catch (error) {
    return json({ error: readError(error) }, 500);
  }
});
