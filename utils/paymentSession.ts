/**
 * Shared payment handoff: subscription_id + FIB session payload.
 * URL is the source of truth; storage is backup for gateway redirects / FIB.
 */

export const PENDING_SUBSCRIPTION_ID_KEY = 'pendingSubscriptionId';
export const FIB_LATEST_SUBSCRIPTION_ID_KEY = 'fibPaymentLatestSubscriptionId';
const FIB_DATA_PREFIX = 'fibPaymentData:';

export type FibPaymentSessionPayload = {
  payment_id: string;
  qr_code?: string | null;
  readable_code?: string | null;
  business_app_link?: string | null;
  corporate_app_link?: string | null;
  personal_app_link?: string | null;
  valid_until?: string | null;
  [key: string]: unknown;
};

export function setPendingSubscriptionId(subscriptionId: string | number): void {
  try {
    localStorage.setItem(PENDING_SUBSCRIPTION_ID_KEY, String(subscriptionId));
  } catch {
    /* ignore */
  }
}

export function getPendingSubscriptionId(): string | null {
  try {
    return localStorage.getItem(PENDING_SUBSCRIPTION_ID_KEY);
  } catch {
    return null;
  }
}

export function clearPendingSubscriptionId(): void {
  try {
    localStorage.removeItem(PENDING_SUBSCRIPTION_ID_KEY);
  } catch {
    /* ignore */
  }
}

function fibDataKey(subscriptionId: string | number): string {
  return `${FIB_DATA_PREFIX}${subscriptionId}`;
}

export function setFibPaymentSession(
  subscriptionId: string | number,
  payload: FibPaymentSessionPayload | Record<string, unknown>,
): void {
  try {
    sessionStorage.setItem(fibDataKey(subscriptionId), JSON.stringify(payload));
    sessionStorage.setItem(FIB_LATEST_SUBSCRIPTION_ID_KEY, String(subscriptionId));
    setPendingSubscriptionId(subscriptionId);
  } catch {
    /* ignore */
  }
}

export function getFibPaymentSession(
  subscriptionId: string | number,
): FibPaymentSessionPayload | null {
  try {
    const raw = sessionStorage.getItem(fibDataKey(subscriptionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FibPaymentSessionPayload;
    if (parsed?.payment_id == null) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearFibPaymentSession(subscriptionId?: string | number | null): void {
  try {
    if (subscriptionId != null) {
      sessionStorage.removeItem(fibDataKey(subscriptionId));
    } else {
      const keys: string[] = [];
      for (let i = 0; i < sessionStorage.length; i += 1) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(FIB_DATA_PREFIX)) keys.push(key);
      }
      keys.forEach((k) => sessionStorage.removeItem(k));
    }
    sessionStorage.removeItem(FIB_LATEST_SUBSCRIPTION_ID_KEY);
  } catch {
    /* ignore */
  }
}

/** Clear pending subscription + all FIB session keys after successful payment. */
export function clearPaymentSessionHandoff(subscriptionId?: string | number | null): void {
  clearPendingSubscriptionId();
  clearFibPaymentSession(subscriptionId);
}

/**
 * Resolve subscription_id: URL first, then pending / FIB fallbacks.
 */
export function resolveSubscriptionIdFromContext(
  urlSubscriptionId: string | null,
): string | null {
  if (urlSubscriptionId) return urlSubscriptionId;
  const pending = getPendingSubscriptionId();
  if (pending) return pending;
  try {
    const latest = sessionStorage.getItem(FIB_LATEST_SUBSCRIPTION_ID_KEY);
    if (latest) return latest;
    const fibKeys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(FIB_DATA_PREFIX)) fibKeys.push(key);
    }
    if (fibKeys.length === 1) {
      return fibKeys[0].replace(FIB_DATA_PREFIX, '');
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function isFibSessionPayload(response: unknown): boolean {
  if (!response || typeof response !== 'object') return false;
  const r = response as Record<string, unknown>;
  return (
    r.payment_id != null &&
    !!(r.qr_code || r.readable_code || r.personal_app_link)
  );
}

/** Cache FIB payload and navigate to PaymentPage with subscription_id in the URL. */
export function routeToFibPaymentPage(
  subscriptionId: string | number,
  response: FibPaymentSessionPayload | Record<string, unknown>,
): void {
  setFibPaymentSession(subscriptionId, response);
  window.location.href = `/payment?subscription_id=${subscriptionId}`;
}

export function paymentPageUrl(subscriptionId: string | number): string {
  return `/payment?subscription_id=${subscriptionId}`;
}

export function paymentSuccessUrl(
  subscriptionId: string | number,
  status: string = 'success',
): string {
  return `/payment/success?subscription_id=${subscriptionId}&status=${status}`;
}

/** True for `/payment/success` and `/payment/return` (with or without trailing slash). */
export function isPaymentSuccessPath(pathname: string): boolean {
  const normalized = decodeURIComponent(pathname).replace(/\/+$/, '') || '/';
  return (
    normalized === '/payment/success' ||
    normalized.endsWith('/payment/success') ||
    normalized === '/payment/return' ||
    normalized.endsWith('/payment/return')
  );
}

/**
 * Detect gateway browser return query (PayTabs, Stripe, Zain, etc.) even if the
 * SPA rewrote the path to a company dashboard.
 */
export function isGatewayPaymentReturnSearch(search: string = typeof window !== 'undefined' ? window.location.search : ''): boolean {
  try {
    const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
    if (!params.get('subscription_id')) return false;
    const status = (params.get('status') || '').toLowerCase();
    const hasGatewayRef =
      !!params.get('tranRef') ||
      !!params.get('tran_ref') ||
      !!params.get('session_id') ||
      !!params.get('token');
    const hasTerminalStatus =
      status === 'success' ||
      status === 'failed' ||
      status === 'pending' ||
      status === 'error';
    return hasGatewayRef || hasTerminalStatus;
  } catch {
    return false;
  }
}

/** Normalize misplaced gateway returns onto `/payment/success` (keeps query string). */
export function ensurePaymentSuccessLocation(): boolean {
  if (typeof window === 'undefined') return false;
  const { pathname, search } = window.location;
  if (isPaymentSuccessPath(pathname)) return false;
  if (!isGatewayPaymentReturnSearch(search)) return false;
  window.history.replaceState({}, '', `/payment/success${search}${window.location.hash || ''}`);
  return true;
}
