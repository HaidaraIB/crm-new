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

export function hydratePaymentAccessToken(): boolean {
  if (typeof localStorage === 'undefined') return false;
  if (localStorage.getItem('accessToken')) return true;
  try {
    const raw = localStorage.getItem('pendingUserData');
    if (raw) {
      const data = JSON.parse(raw) as {
        accessToken?: string;
        refreshToken?: string;
        access?: string;
        refresh?: string;
      };
      const access = data.accessToken || data.access;
      const refresh = data.refreshToken || data.refresh;
      if (access) {
        localStorage.setItem('accessToken', access);
        if (refresh) localStorage.setItem('refreshToken', refresh);
        return true;
      }
    }
  } catch {
    /* fall through to the billing-scoped token */
  }
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

export function paymentLoginUrl(subscriptionId: string | number | null): string {
  if (subscriptionId) {
    return `/login?subscription_id=${subscriptionId}&next=payment`;
  }
  return '/login';
}
