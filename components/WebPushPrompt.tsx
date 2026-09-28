import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  isWebPushConfigured,
  isWebPushReady,
  requestWebPushPermission,
} from '../services/webPush';
import { Button } from './Button';

const DISMISS_KEY = 'webPushPromptDismissed';

/**
 * Modal shown after login when browser push is configured but not enabled.
 * Permission must be requested from a user gesture — this is that surface.
 * "Not now" dismisses for the current session only.
 */
export function WebPushPrompt() {
  const { t, language } = useAppContext();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<'error' | 'denied' | null>(null);

  useEffect(() => {
    if (!isWebPushConfigured()) return;
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted' || isWebPushReady()) return;
    if (sessionStorage.getItem(DISMISS_KEY) === '1') return;
    const id = window.setTimeout(() => setOpen(true), 800);
    return () => window.clearTimeout(id);
  }, []);

  if (!open) return null;

  const permission =
    typeof Notification !== 'undefined' ? Notification.permission : 'denied';
  const blocked = permission === 'denied';

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setOpen(false);
  };

  const onEnable = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const ok = await requestWebPushPermission();
      if (ok) {
        setOpen(false);
        return;
      }
      setFeedback(Notification.permission === 'denied' ? 'denied' : 'error');
    } catch {
      setFeedback('error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="web-push-prompt-title"
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800"
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        <h3
          id="web-push-prompt-title"
          className="mb-2 text-lg font-semibold text-gray-900 dark:text-white"
        >
          {t('webPushPromptTitle')}
        </h3>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
          {blocked ? t('webPushBlockedHint') : t('webPushPromptHint')}
        </p>
        {feedback === 'error' ? (
          <p className="mb-3 text-xs text-red-600 dark:text-red-400">{t('webPushEnableFailed')}</p>
        ) : null}
        {feedback === 'denied' ? (
          <p className="mb-3 text-xs text-red-600 dark:text-red-400">{t('webPushBlockedHint')}</p>
        ) : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" disabled={busy} onClick={dismiss}>
            {t('webPushNotNow')}
          </Button>
          {blocked ? null : (
            <Button
              type="button"
              variant="primary"
              loading={busy}
              disabled={busy}
              onClick={() => void onEnable()}
            >
              {t('webPushEnable')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
