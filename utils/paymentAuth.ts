/**
 * Ensure JWT is available for payment create/status.
 *
 * Two flows arrive here without a normal session:
 * - Registration stores tokens on pendingUserData without always setting accessToken.
 * - An owner whose subscription lapsed cannot log in at all, so the backend hands
 *   them a checkout-only `paymentToken` alongside the SUBSCRIPTION_INACTIVE error.
 *   That token is confined server-side to the payment endpoints.
 */

export const PAYMENT_ACCESS_TOKEN_KEY = 'paymentAccessToken';

/** Persist the checkout-only token from an inactive-subscription login error. */
export function storePaymentAccessToken(token: string | null | undefined): void {
  if (!token) return;
  try {
    localStorage.setItem(PAYMENT_ACCESS_TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearPaymentAccessToken(): void {
  try {
    localStorage.removeItem(PAYMENT_ACCESS_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

function pendingRegistrationToken(subscriptionId?: string | number | null): {
  access: string;
  refresh?: string;
} | null {
  try {
    const raw = localStorage.getItem('pendingUserData');
    if (!raw) return null;
    const data = JSON.parse(raw) as {
      accessToken?: string;
      refreshToken?: string;
      access?: string;
      refresh?: string;
      subscriptionId?: string | number;
      subscription_id?: string | number;
    };
    const access = data.accessToken || data.access;
    if (!access) return null;
    if (subscriptionId != null && String(subscriptionId) !== '') {
      const pendingSub = data.subscriptionId ?? data.subscription_id;
      if (pendingSub == null || String(pendingSub) !== String(subscriptionId)) {
        return null;
      }
    } else if (localStorage.getItem('accessToken')) {
      // No subscription to match against: keep the signed-in session.
      return null;
    }
    const refresh = data.refreshToken || data.refresh;
    return { access, refresh: refresh || undefined };
  } catch {
    return null;
  }
}

export function hydratePaymentAccessToken(subscriptionId?: string | number | null): boolean {
  if (typeof localStorage === 'undefined') return false;
  // Registration stores its own JWT on pendingUserData. A leftover accessToken
  // from another company would poll that company's payment-status and get 403.
  const pending = pendingRegistrationToken(subscriptionId);
  if (pending) {
    localStorage.setItem('accessToken', pending.access);
    if (pending.refresh) localStorage.setItem('refreshToken', pending.refresh);
    return true;
  }
  if (localStorage.getItem('accessToken')) return true;
  try {
    // No refresh token to pair with this one: it is deliberately short-lived,
    // and a fresh one is minted on the next login attempt once it expires.
    const paymentToken = localStorage.getItem(PAYMENT_ACCESS_TOKEN_KEY);
    if (!paymentToken) return false;
    localStorage.setItem('accessToken', paymentToken);
    return true;
  } catch {
    return false;
  }
}

/** 403 from payment-status when the signed-in company does not own the subscription. */
export function isPaymentStatusWrongAccount(err: unknown): boolean {
  const errObj = err as { status?: number; code?: string };
  return errObj.status === 403 && errObj.code === 'forbidden';
}

export function paymentLoginUrl(subscriptionId: string | number | null): string {
  if (subscriptionId) {
    return `/login?subscription_id=${subscriptionId}&next=payment`;
  }
  return '/login';
}
