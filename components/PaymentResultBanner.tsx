import React, { useCallback, useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  clearPaymentFeedback,
  peekPaymentFeedback,
  type PaymentFeedback,
  type PaymentFeedbackStatus,
} from '../utils/paymentFeedback';

type PaymentResultBannerProps = {
  className?: string;
  /** Compact style for login form */
  compact?: boolean;
  /** Auto-dismiss after ms (0 = no auto hide). Clears storage on dismiss. */
  autoHideMs?: number;
  /** If true, clear storage when banner is dismissed / auto-hidden */
  clearOnDismiss?: boolean;
  maxAgeMs?: number;
};

const statusStyles: Record<
  PaymentFeedbackStatus,
  { wrap: string; iconBg: string; title: string; body: string; button: string }
> = {
  success: {
    wrap: 'border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-500/50 shadow-green-500/15',
    iconBg: 'bg-green-500',
    title: 'text-green-800 dark:text-green-300',
    body: 'text-green-700 dark:text-green-400',
    button: 'text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300',
  },
  failed: {
    wrap: 'border-red-500 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 dark:border-red-500/50 shadow-red-500/15',
    iconBg: 'bg-red-500',
    title: 'text-red-800 dark:text-red-300',
    body: 'text-red-700 dark:text-red-400',
    button: 'text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300',
  },
  pending: {
    wrap: 'border-amber-500 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 dark:border-amber-500/50 shadow-amber-500/15',
    iconBg: 'bg-amber-500',
    title: 'text-amber-800 dark:text-amber-300',
    body: 'text-amber-700 dark:text-amber-400',
    button: 'text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300',
  },
};

function resolveText(
  t: (key: string) => string,
  key: string | undefined,
  fallbackKey: string,
  override?: string,
): string {
  if (override && override.trim()) return override;
  if (key) {
    const translated = t(key);
    if (translated && translated !== key) return translated;
  }
  return t(fallbackKey);
}

export const PaymentResultBanner: React.FC<PaymentResultBannerProps> = ({
  className = '',
  compact = false,
  autoHideMs = 0,
  clearOnDismiss = true,
  maxAgeMs,
}) => {
  const { t, language } = useAppContext();
  const [feedback, setFeedback] = useState<PaymentFeedback | null>(null);

  useEffect(() => {
    setFeedback(peekPaymentFeedback(maxAgeMs));
  }, [maxAgeMs]);

  const dismiss = useCallback(() => {
    if (clearOnDismiss) clearPaymentFeedback();
    setFeedback(null);
  }, [clearOnDismiss]);

  useEffect(() => {
    if (!feedback || !autoHideMs || autoHideMs <= 0) return;
    const id = window.setTimeout(dismiss, autoHideMs);
    return () => window.clearTimeout(id);
  }, [feedback, autoHideMs, dismiss]);

  if (!feedback) return null;

  const styles = statusStyles[feedback.status];
  const title =
    feedback.status === 'success'
      ? resolveText(t, feedback.titleKey, 'paymentSuccess')
      : feedback.status === 'failed'
        ? resolveText(t, feedback.titleKey, 'paymentError')
        : resolveText(t, feedback.titleKey, 'paymentPending');

  const message =
    feedback.status === 'success'
      ? resolveText(t, feedback.messageKey, 'paymentSuccessMessage', feedback.message)
      : feedback.status === 'failed'
        ? resolveText(t, feedback.messageKey, 'paymentFailed', feedback.message)
        : resolveText(t, feedback.messageKey, 'paymentPending', feedback.message);

  if (compact) {
    const compactWrap =
      feedback.status === 'success'
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
        : feedback.status === 'failed'
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
          : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200';

    return (
      <div
        className={`border px-4 py-3 rounded-md text-sm ${compactWrap} ${className} ${language === 'ar' ? 'font-arabic' : ''}`}
        role="status"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{title}</p>
            <p className="mt-0.5 opacity-90">{message}</p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 opacity-70 hover:opacity-100"
            aria-label={t('close')}
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`mb-6 p-5 sm:p-6 rounded-2xl border-2 shadow-xl animate-slide-down ${styles.wrap} ${className} ${language === 'ar' ? 'font-arabic' : 'font-sans'}`}
      role="status"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex-shrink-0 w-10 h-10 ${styles.iconBg} rounded-full flex items-center justify-center`}>
            {feedback.status === 'success' ? (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : feedback.status === 'failed' ? (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div className="min-w-0">
            <h3 className={`text-lg font-bold ${styles.title}`}>{title}</h3>
            <p className={`text-sm mt-1 ${styles.body}`}>{message}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className={`flex-shrink-0 transition-colors ${styles.button}`}
          aria-label={t('close')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
