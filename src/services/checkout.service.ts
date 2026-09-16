import { supabase } from '../lib/supabase';
import {
  BuyerOrderHistoryEntry,
  CHECKOUT_SESSION_KEY,
  CheckoutOrder,
  CheckoutOrderItem,
  CheckoutPayment,
  CheckoutSnapshot,
} from '../types/checkout';
import { CartItem } from '../types/checkout';

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

const readFunctionError = async (error: unknown): Promise<string> => {
  if (error && typeof error === 'object' && 'context' in error) {
    const context = (error as { context?: Response }).context;
    if (context instanceof Response) {
      try {
        const payload = asRecord(await context.json());
        return toStringValue(payload.error) || toStringValue(payload.message) || 'Checkout request failed.';
      } catch {
        return 'Checkout request failed.';
      }
    }
  }
  return error instanceof Error ? error.message : 'Checkout request failed.';
};

const mapOrder = (row: Record<string, unknown>): CheckoutOrder => ({
  id: toStringValue(row.id) || '',
  status: toStringValue(row.status) || 'processing',
  totalAmount: toNumber(row.total_amount),
  shippingAddress: toStringValue(row.shipping_address),
  stockDeducted: Boolean(row.stock_deducted),
  createdAt: toStringValue(row.created_at),
});

const mapPayment = (row: Record<string, unknown> | null | undefined): CheckoutPayment | null => {
  if (!row) return null;
  return {
    id: toStringValue(row.id) || '',
    status: toStringValue(row.status) || 'pending',
    amount: toNumber(row.amount),
    transactionId: toStringValue(row.transaction_id),
    upiApp: toStringValue(row.upi_app),
    paymentMethod: toStringValue(row.payment_method),
  };
};

const mapItem = (
  row: Record<string, unknown>,
  productsById: Map<string, Record<string, unknown>>,
): CheckoutOrderItem => {
  const productId = toStringValue(row.product_id) || '';
  const product = productsById.get(productId);
  const title = product ? toStringValue(product.title_en) || toStringValue(product.title) : null;
  const image =
    toStringValue(product?.studio_image_url) ||
    toStringValue(product?.enhanced_image_url) ||
    toStringValue(product?.original_image_url);
  return {
    id: toStringValue(row.id) || '',
    productId,
    vendorId: toStringValue(row.vendor_id),
    quantity: Math.max(1, toNumber(row.quantity)),
    unitPrice: toNumber(row.unit_price),
    subtotal: toNumber(row.subtotal) || toNumber(row.unit_price) * Math.max(1, toNumber(row.quantity)),
    title,
    image,
  };
};

export const createCheckoutIdempotencyKey = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `checkout-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const rememberCheckoutIdempotencyKey = (key: string): void => {
  sessionStorage.setItem(CHECKOUT_SESSION_KEY, key);
};

export const readCheckoutIdempotencyKey = (): string | null => {
  return sessionStorage.getItem(CHECKOUT_SESSION_KEY);
};

export const clearCheckoutIdempotencyKey = (): void => {
  sessionStorage.removeItem(CHECKOUT_SESSION_KEY);
};

export const createCheckoutOrder = async (input: {
  items: CartItem[];
  shippingAddress: string;
  idempotencyKey: string;
}): Promise<{ order: CheckoutOrder; payment: CheckoutPayment | null; idempotent: boolean }> => {
  const { data, error } = await supabase.functions.invoke('marketplace-checkout', {
    body: {
      action: 'create_order',
      items: input.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      shippingAddress: input.shippingAddress,
      idempotencyKey: input.idempotencyKey,
    },
  });

  if (error) throw new Error(await readFunctionError(error));
  const payload = asRecord(data);
  if (!payload.success) throw new Error(toStringValue(payload.error) || 'Order could not be created.');

  return {
    order: mapOrder(asRecord(payload.order)),
    payment: mapPayment(asRecord(payload.payment)),
    idempotent: Boolean(payload.idempotent),
  };
};

const assembleHistory = (
  orders: Record<string, unknown>[],
  items: Record<string, unknown>[],
  payments: Record<string, unknown>[],
  products: Record<string, unknown>[],
): BuyerOrderHistoryEntry[] => {
  const productsById = new Map<string, Record<string, unknown>>();
  products.forEach((row) => {
    const id = toStringValue(row.id);
    if (id) productsById.set(id, row);
  });

  const itemsByOrder = new Map<string, CheckoutOrderItem[]>();
  items.forEach((row) => {
    const orderId = toStringValue(row.order_id) || '';
    const group = itemsByOrder.get(orderId) || [];
    group.push(mapItem(row, productsById));
    itemsByOrder.set(orderId, group);
  });

  const paymentByOrder = new Map<string, CheckoutPayment>();
  payments.forEach((row) => {
    const orderId = toStringValue(row.order_id) || '';
    const payment = mapPayment(row);
    if (orderId && payment) paymentByOrder.set(orderId, payment);
  });

  return orders.map((row) => {
    const order = mapOrder(row);
    return {
      order,
      items: itemsByOrder.get(order.id) || [],
      payment: paymentByOrder.get(order.id) || null,
    };
  });
};

const listBuyerOrdersFromTables = async (): Promise<BuyerOrderHistoryEntry[]> => {
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('id, status, total_amount, shipping_address, stock_deducted, created_at')
    .order('created_at', { ascending: false });

  if (ordersError) throw ordersError;
  const orderRows = (orders || []).map(asRecord);
  const orderIds = orderRows.map((row) => toStringValue(row.id)).filter((id): id is string => Boolean(id));
  if (!orderIds.length) return [];

  const [{ data: items, error: itemsError }, { data: payments, error: paymentsError }] = await Promise.all([
    supabase.from('order_items').select('id, order_id, product_id, vendor_id, quantity, unit_price, subtotal').in('order_id', orderIds),
    supabase.from('payments').select('id, order_id, status, amount, transaction_id, upi_app, payment_method').in('order_id', orderIds),
  ]);

  if (itemsError) throw itemsError;
  if (paymentsError) throw paymentsError;

  const itemRows = (items || []).map(asRecord);
  const productIds = Array.from(new Set(itemRows.map((row) => toStringValue(row.product_id)).filter((id): id is string => Boolean(id))));
  let products: Record<string, unknown>[] = [];
  if (productIds.length) {
    const { data: productRows, error: productsError } = await supabase
      .from('products')
      .select('id, title, title_en, original_image_url, studio_image_url, enhanced_image_url')
      .in('id', productIds);
    if (productsError) throw productsError;
    products = (productRows || []).map(asRecord);
  }

  return assembleHistory(orderRows, itemRows, (payments || []).map(asRecord), products);
};

export const listBuyerOrders = async (): Promise<BuyerOrderHistoryEntry[]> => {
  try {
    const { data, error } = await supabase.functions.invoke('marketplace-checkout', {
      body: { action: 'list_orders' },
    });

    if (!error) {
      const payload = asRecord(data);
      if (payload.success) {
        return assembleHistory(
          Array.isArray(payload.orders) ? payload.orders.map(asRecord) : [],
          Array.isArray(payload.items) ? payload.items.map(asRecord) : [],
          Array.isArray(payload.payments) ? payload.payments.map(asRecord) : [],
          Array.isArray(payload.products) ? payload.products.map(asRecord) : [],
        );
      }
    }
  } catch {
    // Fall through to table reads when the function is unavailable or outdated.
  }

  return listBuyerOrdersFromTables();
};

/** Single buyer order by id — RLS-scoped; returns null when not owned / missing. */
export const getBuyerOrder = async (orderId: string): Promise<BuyerOrderHistoryEntry | null> => {
  const trimmed = orderId.trim();
  if (!trimmed) return null;

  try {
    const snapshot = await getCheckoutSnapshot(trimmed);
    if (snapshot.order.id) return snapshot;
  } catch {
    // Fall through to direct table read.
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, status, total_amount, shipping_address, stock_deducted, created_at')
    .eq('id', trimmed)
    .maybeSingle();

  if (orderError) throw orderError;
  if (!order) return null;

  const [{ data: items, error: itemsError }, { data: payments, error: paymentsError }] = await Promise.all([
    supabase.from('order_items').select('id, order_id, product_id, vendor_id, quantity, unit_price, subtotal').eq('order_id', trimmed),
    supabase.from('payments').select('id, order_id, status, amount, transaction_id, upi_app, payment_method').eq('order_id', trimmed),
  ]);

  if (itemsError) throw itemsError;
  if (paymentsError) throw paymentsError;

  const itemRows = (items || []).map(asRecord);
  const productIds = Array.from(new Set(itemRows.map((row) => toStringValue(row.product_id)).filter((id): id is string => Boolean(id))));
  let products: Record<string, unknown>[] = [];
  if (productIds.length) {
    const { data: productRows, error: productsError } = await supabase
      .from('products')
      .select('id, title, title_en, original_image_url, studio_image_url, enhanced_image_url')
      .in('id', productIds);
    if (productsError) throw productsError;
    products = (productRows || []).map(asRecord);
  }

  const [entry] = assembleHistory([asRecord(order)], itemRows, (payments || []).map(asRecord), products);
  return entry || null;
};

export const formatOrderDate = (value: string | null): string => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const getCheckoutSnapshot = async (orderId: string): Promise<CheckoutSnapshot> => {
  const { data, error } = await supabase.functions.invoke('marketplace-checkout', {
    body: { action: 'get_checkout', orderId },
  });

  if (error) throw new Error(await readFunctionError(error));
  const payload = asRecord(data);
  if (!payload.success) throw new Error(toStringValue(payload.error) || 'Checkout could not be loaded.');

  const productsById = new Map<string, Record<string, unknown>>();
  (Array.isArray(payload.products) ? payload.products : []).forEach((row) => {
    const record = asRecord(row);
    const id = toStringValue(record.id);
    if (id) productsById.set(id, record);
  });

  return {
    order: mapOrder(asRecord(payload.order)),
    items: (Array.isArray(payload.items) ? payload.items : []).map((row) => mapItem(asRecord(row), productsById)),
    payment: mapPayment(asRecord(payload.payment)),
  };
};

export interface RazorpayCheckoutSession {
  keyId: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  orderId: string;
  amountInr: number;
  prefill: {
    name: string | null;
    email: string | null;
    contact: string | null;
  };
}

export const createRazorpayCheckoutSession = async (orderId: string): Promise<RazorpayCheckoutSession> => {
  const { data, error } = await supabase.functions.invoke('marketplace-checkout', {
    body: { action: 'create_razorpay_order', orderId },
  });

  if (error) throw new Error(await readFunctionError(error));
  const payload = asRecord(data);
  if (!payload.success) throw new Error(toStringValue(payload.error) || 'Payment could not be prepared.');

  const prefill = asRecord(payload.prefill);
  const keyId = toStringValue(payload.keyId) || toStringValue(payload.key_id);
  const razorpayOrderId = toStringValue(payload.razorpayOrderId) || toStringValue(payload.razorpay_order_id);
  if (!keyId || !razorpayOrderId) {
    throw new Error('Razorpay checkout session is incomplete.');
  }

  return {
    keyId,
    razorpayOrderId,
    amountPaise: Math.round(toNumber(payload.amountPaise || payload.amount_paise)),
    currency: toStringValue(payload.currency) || 'INR',
    orderId: toStringValue(payload.orderId) || orderId,
    amountInr: toNumber(payload.amountInr || payload.amount_inr),
    prefill: {
      name: toStringValue(prefill.name),
      email: toStringValue(prefill.email),
      contact: toStringValue(prefill.contact),
    },
  };
};

export const verifyRazorpayPayment = async (input: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<Record<string, unknown>> => {
  const { data, error } = await supabase.functions.invoke('marketplace-checkout', {
    body: {
      action: 'verify_razorpay_payment',
      orderId: input.orderId,
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      razorpaySignature: input.razorpaySignature,
    },
  });

  if (error) throw new Error(await readFunctionError(error));
  const payload = asRecord(data);
  if (!payload.success) throw new Error(toStringValue(payload.error) || 'Payment could not be verified.');
  return asRecord(payload.result);
};

export const markRazorpayPaymentFailed = async (orderId: string): Promise<Record<string, unknown>> => {
  const { data, error } = await supabase.functions.invoke('marketplace-checkout', {
    body: { action: 'mark_razorpay_failed', orderId },
  });

  if (error) throw new Error(await readFunctionError(error));
  const payload = asRecord(data);
  if (!payload.success) throw new Error(toStringValue(payload.error) || 'Payment status could not be updated.');
  return asRecord(payload.result);
};

export const retryCheckoutPayment = async (orderId: string): Promise<Record<string, unknown>> => {
  const { data, error } = await supabase.functions.invoke('marketplace-checkout', {
    body: { action: 'retry_payment', orderId },
  });

  if (error) throw new Error(await readFunctionError(error));
  const payload = asRecord(data);
  if (!payload.success) throw new Error(toStringValue(payload.error) || 'Payment could not be retried.');
  return asRecord(payload.result);
};

export const formatCurrency = (amount: number): string => `₹${amount.toLocaleString('en-IN')}`;
