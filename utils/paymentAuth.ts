/**
 * Ensure JWT is available for payment create/status after registration.
 * Registration stores tokens on pendingUserData without always setting accessToken.
 */
export function hydratePaymentAccessToken(): boolean {
  if (typeof localStorage === 'undefined') return false;
  if (localStorage.getItem('accessToken')) return true;
  try {
    const raw = localStorage.getItem('pendingUserData');
    if (!raw) return false;
    const data = JSON.parse(raw) as {
      accessToken?: string;
      refreshToken?: string;
      access?: string;
      refresh?: string;
    };
    const access = data.accessToken || data.access;
    const refresh = data.refreshToken || data.refresh;
    if (!access) return false;
    localStorage.setItem('accessToken', access);
    if (refresh) localStorage.setItem('refreshToken', refresh);
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
