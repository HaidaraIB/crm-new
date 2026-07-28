/**
 * Shared payment result feedback for all gateways (Stripe, PayTabs, Zain, QiCard, FIB).
 * Written after checkout verification; shown on login, billing, dashboard, etc.
 */

import { getCompanyRoute } from './routing';

export type PaymentFeedbackStatus = 'success' | 'failed' | 'pending';

/** Where to send the user after hosted checkout (set before redirect to gateway). */
export type PaymentReturnTo = 'Billing' | 'Profile' | 'ChangePlan' | 'Dashboard' | 'Login';

export type PaymentCheckoutContext = {
  returnTo: PaymentReturnTo;
  messageKey?: string;
  titleKey?: string;
};

export type PaymentFeedback = {
  status: PaymentFeedbackStatus;
  /** Preferred: i18n key resolved at display time */
  messageKey?: string;
  titleKey?: string;
  /** Optional gateway-specific or already-localized text */
  message?: string;
  timestamp: number;
  subscriptionId?: number | null;
};

export const PAYMENT_FEEDBACK_KEY = 'paymentFeedback';
export const PAYMENT_CHECKOUT_CONTEXT_KEY = 'paymentCheckoutContext';
/** Legacy key written by older payment success flow */
export const LEGACY_PAYMENT_SUCCESS_KEY = 'paymentSuccessMessage';

const DEFAULT_MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes — survives login

function safeParse(raw: string | null): PaymentFeedback | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as PaymentFeedback | { message?: string; timestamp?: number };
    if (!data || typeof data !== 'object' || typeof (data as PaymentFeedback).timestamp !== 'number') {
      return null;
    }
    // Legacy shape: { message, timestamp }
    if (!('status' in data)) {
      const legacy = data as { message?: string; timestamp: number };
      return {
        status: 'success',
        message: legacy.message,
        messageKey: 'paymentSuccessMessage',
        titleKey: 'paymentSuccess',
        timestamp: legacy.timestamp,
      };
    }
    return data as PaymentFeedback;
  } catch {
    return null;
  }
}

export function setPaymentFeedback(
  input: Omit<PaymentFeedback, 'timestamp'> & { timestamp?: number },
): void {
  if (typeof localStorage === 'undefined') return;
  const payload: PaymentFeedback = {
    status: input.status,
    messageKey: input.messageKey,
    titleKey: input.titleKey,
    message: input.message,
    subscriptionId: input.subscriptionId ?? null,
    timestamp: input.timestamp ?? Date.now(),
  };
  localStorage.setItem(PAYMENT_FEEDBACK_KEY, JSON.stringify(payload));
  // Keep legacy key in sync for any leftover readers during rollout
  if (payload.status === 'success') {
    localStorage.setItem(
      LEGACY_PAYMENT_SUCCESS_KEY,
      JSON.stringify({
        message: payload.message,
        messageKey: payload.messageKey || 'paymentSuccessMessage',
        timestamp: payload.timestamp,
      }),
    );
  } else {
    localStorage.removeItem(LEGACY_PAYMENT_SUCCESS_KEY);
  }
}

export function peekPaymentFeedback(maxAgeMs: number = DEFAULT_MAX_AGE_MS): PaymentFeedback | null {
  if (typeof localStorage === 'undefined') return null;
  const modern = safeParse(localStorage.getItem(PAYMENT_FEEDBACK_KEY));
  const legacy = safeParse(localStorage.getItem(LEGACY_PAYMENT_SUCCESS_KEY));
  const feedback = modern || legacy;
  if (!feedback) return null;
  if (Date.now() - feedback.timestamp > maxAgeMs) {
    clearPaymentFeedback();
    return null;
  }
  return feedback;
}

/** Read feedback and clear storage (one-shot consume). */
export function consumePaymentFeedback(maxAgeMs: number = DEFAULT_MAX_AGE_MS): PaymentFeedback | null {
  const feedback = peekPaymentFeedback(maxAgeMs);
  if (feedback) clearPaymentFeedback();
  return feedback;
}

export function clearPaymentFeedback(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(PAYMENT_FEEDBACK_KEY);
  localStorage.removeItem(LEGACY_PAYMENT_SUCCESS_KEY);
}

export function hasRecentPaymentSuccess(maxAgeMs: number = DEFAULT_MAX_AGE_MS): boolean {
  const f = peekPaymentFeedback(maxAgeMs);
  return !!f && f.status === 'success';
}

/** Call before redirecting to a hosted gateway / FIB page (renew, change plan, register). */
export function setPaymentCheckoutContext(ctx: PaymentCheckoutContext): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(PAYMENT_CHECKOUT_CONTEXT_KEY, JSON.stringify(ctx));
  } catch {
    /* ignore */
  }
}

export function peekPaymentCheckoutContext(): PaymentCheckoutContext | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PAYMENT_CHECKOUT_CONTEXT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PaymentCheckoutContext;
    if (!data?.returnTo) return null;
    return data;
  } catch {
    return null;
  }
}

export function consumePaymentCheckoutContext(): PaymentCheckoutContext | null {
  const ctx = peekPaymentCheckoutContext();
  clearPaymentCheckoutContext();
  return ctx;
}

export function clearPaymentCheckoutContext(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(PAYMENT_CHECKOUT_CONTEXT_KEY);
}

export function pathForPaymentReturn(returnTo: PaymentReturnTo): string {
  if (returnTo === 'Login') return '/login?payment_success=true';

  let companyName: string | undefined;
  let companyDomain: string | undefined;
  try {
    const raw = localStorage.getItem('currentUser');
    if (raw) {
      const user = JSON.parse(raw) as {
        company?: { name?: string; domain?: string };
      };
      companyName = user.company?.name;
      companyDomain = user.company?.domain;
    }
  } catch {
    /* ignore */
  }

  const page =
    returnTo === 'Billing'
      ? 'Billing'
      : returnTo === 'Profile'
        ? 'Profile'
        : returnTo === 'ChangePlan'
          ? 'ChangePlan'
          : 'Dashboard';

  const route = getCompanyRoute(companyName, companyDomain, page);
  if (route) return route;

  const fallback: Record<Exclude<PaymentReturnTo, 'Login'>, string> = {
    Billing: '/billing',
    Profile: '/profile',
    ChangePlan: '/change-plan',
    Dashboard: '/dashboard',
  };
  return fallback[returnTo as Exclude<PaymentReturnTo, 'Login'>] || '/dashboard';
}

export function hasLoggedInPaymentSession(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return (
    !!localStorage.getItem('accessToken') &&
    localStorage.getItem('isLoggedIn') === 'true' &&
    !!localStorage.getItem('currentUser')
  );
}
