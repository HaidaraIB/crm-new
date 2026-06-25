import React, { useEffect } from 'react';

type ChatToastProps = {
  message: string;
  variant?: 'error' | 'warning';
  onDismiss: () => void;
  autoHideMs?: number;
};

/** Non-blocking toast for in-chat feedback (errors/warnings). */
export const ChatToast = ({ message, variant = 'error', onDismiss, autoHideMs = 5000 }: ChatToastProps) => {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, autoHideMs);
    return () => window.clearTimeout(timer);
  }, [message, autoHideMs, onDismiss]);

  const styles =
    variant === 'error'
      ? 'bg-red-950/95 text-red-50 border-red-800/80'
      : 'bg-amber-950/95 text-amber-50 border-amber-800/80';

  return (
    <div
      role="alert"
      className={`pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg backdrop-blur-sm ${styles}`}
    >
      <span className="flex-1 leading-snug">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 opacity-70 hover:opacity-100 text-xs font-medium px-1"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
};
