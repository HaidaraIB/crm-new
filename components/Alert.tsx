import React, { ReactNode, useCallback, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

export type AlertVariant = 'success' | 'error' | 'warning' | 'info';

type AlertProps = {
  variant?: AlertVariant;
  title?: ReactNode;
  children: ReactNode;
  /** Renders a dismiss button when provided. */
  onDismiss?: () => void;
  /** Auto-dismiss after N ms. Requires onDismiss. 0 = persistent (default). */
  autoHideMs?: number;
  className?: string;
};

/**
 * Inline feedback banner — the single source of truth for the
 * "coloured box with a message" pattern.
 *
 * Errors and warnings use role="alert" (interrupts the screen reader, because
 * the user is blocked); success and info use role="status" (announced politely).
 */
const variantStyles: Record<AlertVariant, { wrap: string; icon: string; path: string }> = {
  success: {
    wrap: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300',
    icon: 'text-green-600 dark:text-green-400',
    path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  error: {
    wrap: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300',
    icon: 'text-red-600 dark:text-red-400',
    path: 'M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-3L13.74 4a2 2 0 00-3.48 0L3.33 16a2 2 0 001.74 3z',
  },
  warning: {
    wrap: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
    icon: 'text-amber-600 dark:text-amber-400',
    path: 'M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-3L13.74 4a2 2 0 00-3.48 0L3.33 16a2 2 0 001.74 3z',
  },
  info: {
    wrap: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300',
    icon: 'text-blue-600 dark:text-blue-400',
    path: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
};

export const Alert = ({
  variant = 'info',
  title,
  children,
  onDismiss,
  autoHideMs = 0,
  className = '',
}: AlertProps) => {
  const { t } = useAppContext();
  const styles = variantStyles[variant];

  const dismiss = useCallback(() => onDismiss?.(), [onDismiss]);

  useEffect(() => {
    if (!onDismiss || !autoHideMs) return;
    const id = window.setTimeout(dismiss, autoHideMs);
    return () => window.clearTimeout(id);
  }, [autoHideMs, dismiss, onDismiss]);

  return (
    <div
      role={variant === 'error' || variant === 'warning' ? 'alert' : 'status'}
      className={`flex items-start gap-3 border rounded-lg px-4 py-3 text-sm ${styles.wrap} ${className}`}
    >
      <svg
        className={`mt-0.5 h-5 w-5 shrink-0 ${styles.icon}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={styles.path} />
      </svg>
      {/* plaintext bidi keeps mixed AR/EN text and phone numbers from scrambling in RTL */}
      <div className="min-w-0 flex-1 [unicode-bidi:plaintext]">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={title ? 'mt-0.5 opacity-90' : ''}>{children}</div>
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current"
          aria-label={t('close')}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ) : null}
    </div>
  );
};
