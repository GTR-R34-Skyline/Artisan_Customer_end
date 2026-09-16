/**
 * Fail-soft bridge from Edge Functions → local WhatsApp Web automation service.
 * TEST/DEMO only. Never throws to callers. Does not replace Resend email.
 */

import { buildSellerWhatsAppMessage, normalizeIndianWhatsAppPhone } from './sellerPhone.ts';

export interface SellerWhatsAppInput {
  phone: string;
  sellerName: string;
  orderId: string;
  idempotencyKey: string;
  message?: string;
}

export interface SellerWhatsAppResult {
  sent: boolean;
  submitted?: boolean;
  skipped?: string;
  error?: string;
  phone?: string;
  status?: string;
}

const localBaseUrl = (): string =>
  (Deno.env.get('WHATSAPP_LOCAL_URL') || 'http://127.0.0.1:4177').replace(/\/$/, '');

export const sendSellerWhatsAppNotification = async (
  input: SellerWhatsAppInput,
): Promise<SellerWhatsAppResult> => {
  const normalized = normalizeIndianWhatsAppPhone(input.phone);
  if (!normalized) {
    console.warn('[seller-whatsapp] skipped_invalid_phone', {
      orderId: input.orderId,
      sellerName: input.sellerName,
    });
    return { sent: false, skipped: 'invalid_phone' };
  }

  const enabled = (Deno.env.get('WHATSAPP_NOTIFY_ENABLED') || 'true').toLowerCase() !== 'false';
  if (!enabled) {
    return { sent: false, skipped: 'whatsapp_notify_disabled', phone: normalized };
  }

  const token = (Deno.env.get('WHATSAPP_LOCAL_TOKEN') || '').trim();
  const url = `${localBaseUrl()}/send-whatsapp`;
  const message = input.message?.trim() || buildSellerWhatsAppMessage(input.sellerName);

  console.info('[seller-whatsapp] requesting_local_service', {
    orderId: input.orderId,
    sellerName: input.sellerName,
    phone: normalized,
  });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 240000);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        phone: normalized,
        sellerName: input.sellerName,
        message,
        idempotencyKey: input.idempotencyKey,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    const submitted = Boolean(payload.submitted);
    if (!response.ok || !submitted) {
      console.warn('[seller-whatsapp] not_submitted', {
        orderId: input.orderId,
        status: response.status,
        payload,
      });
      return {
        sent: false,
        submitted: false,
        phone: normalized,
        error: String(payload.error || `local_service_status_${response.status}`),
        status: typeof payload.status === 'string' ? payload.status : undefined,
      };
    }

    console.info('[seller-whatsapp] submitted', {
      orderId: input.orderId,
      phone: normalized,
    });
    return {
      sent: true,
      submitted: true,
      phone: normalized,
      status: typeof payload.status === 'string' ? payload.status : 'WhatsApp message submitted',
    };
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    console.warn('[seller-whatsapp] local_service_unavailable', {
      orderId: input.orderId,
      message: messageText,
    });
    return {
      sent: false,
      submitted: false,
      phone: normalized,
      skipped: 'local_whatsapp_service_unavailable',
      error: messageText,
    };
  }
};
