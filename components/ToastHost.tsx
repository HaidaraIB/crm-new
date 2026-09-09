import React, { ReactNode, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import type { AlertVariant } from './Alert';

export type Toast = {
  id: number;
  message: ReactNode;
  variant: AlertVariant;
  durationMs: number;
};

const variantStyles: Record<AlertVariant, { wrap: string; icon: string; path: string }> = {
  success: {
    wrap: 'border-green-300/80 bg-white/95 dark:border-green-700/60 dark:bg-gray-900/95',
    icon: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    path: 'M5 13l4 4L19 7',
  },
  error: {
    wrap: 'border-red-300/80 bg-white/95 dark:border-red-700/60 dark:bg-gray-900/95',
    icon: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    path: 'M6 18L18 6M6 6l12 12',
  },
  warning: {
    wrap: 'border-amber-300/80 bg-white/95 dark:border-amber-700/60 dark:bg-gray-900/95',
    icon: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    path: 'M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-3L13.74 4a2 2 0 00-3.48 0L3.33 16a2 2 0 001.74 3z',
  },
  info: {
    wrap: 'border-gray-300/80 bg-white/95 dark:border-gray-700/60 dark:bg-gray-900/95',
    icon: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    path: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
};

const ToastItem = ({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) => {
  const { t } = useAppContext();
  const styles = variantStyles[toast.variant];

  useEffect(() => {
    if (!toast.durationMs) return;
    const id = window.setTimeout(() => onDismiss(toast.id), toast.durationMs);
    return () => window.clearTimeout(id);
  }, [toast.id, toast.durationMs, onDismiss]);

  return (
    <div
      role={toast.variant === 'error' || toast.variant === 'warning' ? 'alert' : 'status'}
      className={`pointer-events-auto flex w-[min(100vw-2rem,24rem)] items-start gap-3 overflow-hidden rounded-xl border p-3 shadow-xl backdrop-blur-sm animate-slide-down ${styles.wrap}`}
    >
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${styles.icon}`}>
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={styles.path} />
        </svg>
      </span>
      {/* plaintext bidi keeps mixed AR/EN text and phone numbers from scrambling in RTL */}
      <p className="min-w-0 flex-1 self-center text-sm leading-snug text-gray-900 dark:text-gray-100 [unicode-bidi:plaintext]">
        {toast.message}
      </p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        aria-label={t('dismiss')}
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

/**
 * Non-blocking feedback stack, pinned to the bottom inline-end corner
 * (bottom-right in LTR, bottom-left in RTL via the logical `end-0`).
 *
 * Mounted once in App.tsx; drive it with `showToast` from AppContext.
 */
export const ToastHost = () => {
  const { toasts, dismissToast } = useAppContext();

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-0 end-0 z-[95] flex flex-col items-end gap-2 p-4 sm:p-6"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
};
