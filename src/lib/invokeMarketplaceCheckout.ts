import { supabase, supabaseAnonKey, supabaseUrl } from './supabase';

/** Checkout can wait on Razorpay + DB; longer than the global Supabase client timeout. */
const MARKETPLACE_CHECKOUT_TIMEOUT_MS = 45000;

export class MarketplaceCheckoutHttpError extends Error {
  readonly context: Response;
  readonly status: number;
  readonly bodyText: string | null;

  constructor(message: string, context: Response, bodyText: string | null) {
    super(message);
    this.name = 'MarketplaceCheckoutHttpError';
    this.context = context;
    this.status = context.status;
    this.bodyText = bodyText;
  }
}

/**
 * Resolve a fresh buyer access token for Edge Function calls.
 * Never falls back to the anon key (which causes marketplace-checkout 401 Invalid session).
 * Does not log the token itself.
 */
export const requireBuyerAccessToken = async (): Promise<{ accessToken: string; userId: string }> => {
  const {
    data: { session: initialSession },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.warn('[marketplace-checkout] session error', {
      sessionExists: false,
      message: sessionError.message,
    });
    throw new Error(sessionError.message || 'Could not restore your session. Please sign in again.');
  }

  let session = initialSession;

  // getSession refreshes when near expiry; if still missing, force a refresh once.
  if (!session?.access_token) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.warn('[marketplace-checkout] session refresh failed', {
        sessionExists: false,
        message: refreshError.message,
      });
      throw new Error(refreshError.message || 'Your session expired. Please sign in again.');
    }
    session = refreshed.session;
  }

  const accessToken = session?.access_token;
  const userId = session?.user?.id;

  if (!accessToken || !userId) {
    console.warn('[marketplace-checkout] session missing', {
      sessionExists: false,
      tokenExists: Boolean(accessToken),
      userIdExists: Boolean(userId),
    });
    throw new Error('Please sign in again to continue checkout.');
  }

  console.info('[marketplace-checkout] session ready', {
    sessionExists: true,
    userId,
    tokenExists: true,
    expiresAt: session.expires_at ?? null,
  });

  return { accessToken, userId };
};

/**
 * Authenticated invoke of marketplace-checkout.
 * Uses an explicit Bearer access token + publishable apikey via fetch
 * (does not rely on supabase.functions.invoke header attachment).
 */
export const invokeMarketplaceCheckout = async <T = unknown>(
  body: Record<string, unknown>,
): Promise<{ data: T | null; error: unknown }> => {
  const { accessToken, userId } = await requireBuyerAccessToken();
  const action = typeof body.action === 'string' ? body.action : null;

  console.info('[marketplace-checkout] invoke', {
    action,
    userId,
    sessionExists: true,
    authorizationAttached: true,
  });

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), MARKETPLACE_CHECKOUT_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/marketplace-checkout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (fetchError) {
    window.clearTimeout(timeout);
    const aborted =
      (fetchError instanceof DOMException && fetchError.name === 'AbortError')
      || (fetchError instanceof Error && fetchError.name === 'AbortError');
    const message = aborted
      ? 'Checkout request timed out. Please retry with a stable connection.'
      : fetchError instanceof Error
        ? fetchError.message
        : 'Failed to reach the checkout service.';

    console.warn('[marketplace-checkout] invoke failed', {
      action,
      userId,
      sessionExists: true,
      status: null,
      gatewayCode: null,
      message,
    });

    return { data: null, error: new Error(message) };
  } finally {
    window.clearTimeout(timeout);
  }

  const gatewayCode = response.headers.get('sb-error-code');
  const bodyText = await response.text().catch(() => null);

  let parsed: unknown = null;
  if (bodyText) {
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const payload =
      parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    const serverMessage =
      (typeof payload.error === 'string' && payload.error.trim())
      || (typeof payload.message === 'string' && payload.message.trim())
      || (typeof payload.msg === 'string' && payload.msg.trim())
      || null;

    console.warn('[marketplace-checkout] invoke failed', {
      action,
      userId,
      sessionExists: true,
      status: response.status,
      gatewayCode,
      message: serverMessage || `Checkout request failed (${response.status}).`,
      bodyPreview: bodyText ? bodyText.slice(0, 300) : null,
    });

    // Attach a Response whose json()/text() still work for readFunctionError.
    const errorResponse = new Response(bodyText, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });

    return {
      data: null,
      error: new MarketplaceCheckoutHttpError(
        serverMessage || `Checkout request failed (${response.status}).`,
        errorResponse,
        bodyText,
      ),
    };
  }

  console.info('[marketplace-checkout] invoke ok', {
    action,
    userId,
    status: response.status,
  });

  return { data: (parsed as T) ?? null, error: null };
};
