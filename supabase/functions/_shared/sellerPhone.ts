/**
 * Indian seller phone helpers for purchase notifications.
 * Keep in sync with whatsapp-service/phone.js
 */

export const digitsOnly = (value: string | null | undefined): string =>
  String(value || '').replace(/\D/g, '');

export const isPlaceholderPhone = (value: string | null | undefined): boolean => {
  const digits = digitsOnly(value);
  if (!digits) return true;
  if (digits.startsWith('9000000')) return true;
  if (digits.length < 10) return true;
  return false;
};

export const normalizeIndianWhatsAppPhone = (raw: string | null | undefined): string | null => {
  if (isPlaceholderPhone(raw)) return null;

  let digits = digitsOnly(raw);
  if (!digits) return null;

  if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }

  if (digits.startsWith('91') && digits.length === 12) {
    const national = digits.slice(2);
    if (/^[6-9]\d{9}$/.test(national) && !isPlaceholderPhone(national)) return digits;
    return null;
  }

  if (/^[6-9]\d{9}$/.test(digits)) {
    return `91${digits}`;
  }

  if (digits.startsWith('910') && digits.length === 13) {
    const national = digits.slice(3);
    if (/^[6-9]\d{9}$/.test(national) && !isPlaceholderPhone(national)) return `91${national}`;
  }

  return null;
};

export const buildSellerWhatsAppMessage = (sellerName: string): string => {
  const name = String(sellerName || 'Artisan').trim() || 'Artisan';
  return [
    `Hello ${name},`,
    '',
    'Your product has been purchased.',
    '',
    'Please check your ARTISAN seller dashboard and handle/process the order.',
    '',
    'Regards,',
    'ARTISAN',
  ].join('\n');
};
