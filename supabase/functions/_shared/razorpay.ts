/**
 * Server-side Razorpay helpers. Key Secret must never leave Edge Function secrets.
 */

const RAZORPAY_API = 'https://api.razorpay.com/v1';

export const getRazorpayCredentials = (): { keyId: string; keySecret: string } => {
  const keyId = (Deno.env.get('RAZORPAY_KEY_ID') || '').trim();
  const keySecret = (Deno.env.get('RAZORPAY_KEY_SECRET') || '').trim();
  if (!keyId || !keySecret) {
    throw new Error('Razorpay is not configured on the server.');
  }
  return { keyId, keySecret };
};

/** Convert INR major units to paise without float drift for 2-decimal money. */
export const inrToPaise = (amountInr: number | string): number => {
  const n = typeof amountInr === 'number' ? amountInr : Number(amountInr);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('Invalid payment amount.');
  }
  const [whole, frac = ''] = n.toFixed(2).split('.');
  return Number(whole) * 100 + Number((frac + '00').slice(0, 2));
};

export const paiseToInrNumber = (paise: number): number => {
  if (!Number.isFinite(paise) || paise < 0) return 0;
  return Math.round(paise) / 100;
};

const basicAuthHeader = (keyId: string, keySecret: string): string =>
  `Basic ${btoa(`${keyId}:${keySecret}`)}`;

const toHex = (buffer: ArrayBuffer): string =>
  [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');

export const hmacSha256Hex = async (secret: string, message: string): Promise<string> => {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return toHex(signature);
};

export const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
};

export const verifyCheckoutSignature = async (input: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  keySecret: string;
}): Promise<boolean> => {
  const expected = await hmacSha256Hex(
    input.keySecret,
    `${input.razorpayOrderId}|${input.razorpayPaymentId}`,
  );
  return timingSafeEqual(expected, input.razorpaySignature.trim().toLowerCase())
    || timingSafeEqual(expected, input.razorpaySignature.trim());
};

export const verifyWebhookSignature = async (input: {
  body: string;
  signature: string;
  secret: string;
}): Promise<boolean> => {
  const expected = await hmacSha256Hex(input.secret, input.body);
  return timingSafeEqual(expected, input.signature.trim().toLowerCase())
    || timingSafeEqual(expected, input.signature.trim());
};

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt?: string | null;
}

export interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  method?: string | null;
  captured?: boolean;
}

export const createRazorpayOrder = async (input: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> => {
  const { keyId, keySecret } = getRazorpayCredentials();
  const response = await fetch(`${RAZORPAY_API}/orders`, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(keyId, keySecret),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: 'INR',
      receipt: input.receipt.slice(0, 40),
      notes: input.notes || {},
      payment_capture: 1,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.error?.description === 'string'
      ? payload.error.description
      : 'Razorpay order could not be created.';
    throw new Error(message);
  }

  return {
    id: String(payload.id || ''),
    amount: Number(payload.amount),
    currency: String(payload.currency || 'INR'),
    status: String(payload.status || ''),
    receipt: payload.receipt ? String(payload.receipt) : null,
  };
};

export const fetchRazorpayPayment = async (paymentId: string): Promise<RazorpayPayment> => {
  const { keyId, keySecret } = getRazorpayCredentials();
  const response = await fetch(`${RAZORPAY_API}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: basicAuthHeader(keyId, keySecret) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.error?.description === 'string'
      ? payload.error.description
      : 'Razorpay payment could not be loaded.';
    throw new Error(message);
  }

  return {
    id: String(payload.id || ''),
    order_id: String(payload.order_id || ''),
    amount: Number(payload.amount),
    currency: String(payload.currency || 'INR'),
    status: String(payload.status || ''),
    method: payload.method ? String(payload.method) : null,
    captured: Boolean(payload.captured),
  };
};

export const fetchRazorpayOrder = async (orderId: string): Promise<RazorpayOrder> => {
  const { keyId, keySecret } = getRazorpayCredentials();
  const response = await fetch(`${RAZORPAY_API}/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: basicAuthHeader(keyId, keySecret) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.error?.description === 'string'
      ? payload.error.description
      : 'Razorpay order could not be loaded.';
    throw new Error(message);
  }

  return {
    id: String(payload.id || ''),
    amount: Number(payload.amount),
    currency: String(payload.currency || 'INR'),
    status: String(payload.status || ''),
    receipt: payload.receipt ? String(payload.receipt) : null,
  };
};

/** payments.upi_app stores the Razorpay order id (no schema change). */
export const razorpayOrderIdFromPayment = (upiApp: unknown): string | null => {
  if (typeof upiApp !== 'string') return null;
  const value = upiApp.trim();
  if (!value) return null;
  if (value.startsWith('order_')) return value;
  return null;
};

/**
 * Map Razorpay payment.method → ARTISAN payments.payment_method.
 * Allowed DB values only: upi | card | netbanking | cod.
 * Razorpay is the gateway, not a payment_method enum value.
 */
export const mapRazorpayMethodToArtisan = (method: string | null | undefined): 'upi' | 'card' | 'netbanking' => {
  const normalized = (method || '').trim().toLowerCase();
  if (normalized === 'card') return 'card';
  if (normalized === 'netbanking') return 'netbanking';
  // Default UPI checkout (upi, upi_collect, wallet fallbacks that are not in constraint → upi)
  return 'upi';
};

export const isSuccessfulRazorpayPayment = (payment: RazorpayPayment): boolean => {
  const status = payment.status.toLowerCase();
  // With payment_capture: 1, successful Checkout payments are "captured".
  return status === 'captured' || Boolean(payment.captured && status === 'authorized');
};
