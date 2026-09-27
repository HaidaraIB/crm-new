import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  isWebPushConfigured,
  isWebPushReady,
  requestWebPushPermission,
} from '../services/webPush';
import { Button } from './Button';
import { Card } from './Card';

type WebPushOptInProps = {
  /** Compact strip for the notifications dialog; section for Profile. */
  variant?: 'banner' | 'section';
};

type PermissionState = NotificationPermission | 'unsupported';

/**
 * Opt-in for browser push. Hidden when Firebase is not configured or the
 * browser cannot do push. Must be clicked by the user — browsers reject
 * permission prompts that are not tied to a gesture.
 */
export function WebPushOptIn({ variant = 'banner' }: WebPushOptInProps) {
  const { t } = useAppContext();
  const [permission, setPermission] = useState<PermissionState>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<'ok' | 'denied' | 'error' | null>(null);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    setConfigured(isWebPushConfigured());
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return;
    }
    const sync = () => setPermission(Notification.permission);
    sync();

    let status: PermissionStatus | null = null;
    const permissions = navigator.permissions;
    if (permissions?.query) {
      void permissions
        .query({ name: 'notifications' as PermissionName })
        .then((s) => {
          status = s;
          s.onchange = sync;
        })
        .catch(() => {
          // Safari / older browsers may reject the query name.
        });
    }
    return () => {
      if (status) status.onchange = null;
    };
  }, []);

  if (!configured || permission === 'unsupported') return null;

  const enabled = permission === 'granted' && (feedback === 'ok' || isWebPushReady());
  // In the dialog, stay quiet once enabled — Profile still shows status.
  if (variant === 'banner' && enabled) return null;

  const onEnable = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const ok = await requestWebPushPermission();
      setPermission(Notification.permission);
      if (ok) {
        setFeedback('ok');
      } else if (Notification.permission === 'denied') {
        setFeedback('denied');
      } else {
        setFeedback('error');
      }
    } catch {
      setFeedback('error');
    } finally {
      setBusy(false);
    }
  };

  const body = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        {variant === 'banner' ? (
          <p className="text-sm font-medium text-gray-900 dark:text-white">{t('webPushTitle')}</p>
        ) : null}
        <p
          className={`text-gray-600 dark:text-gray-300 ${
            variant === 'banner' ? 'mt-0.5 text-xs' : 'text-sm'
          }`}
        >
          {permission === 'denied' ? t('webPushBlockedHint') : t('webPushHint')}
        </p>
        {enabled ? (
          <p className="mt-1 text-xs text-green-600 dark:text-green-400">{t('webPushEnabled')}</p>
        ) : null}
        {feedback === 'error' ? (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{t('webPushEnableFailed')}</p>
        ) : null}
      </div>
      {permission === 'denied' || enabled ? null : (
        <Button
          type="button"
          variant={variant === 'banner' ? 'secondary' : 'primary'}
          className="shrink-0 whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm"
          loading={busy}
          disabled={busy}
          onClick={() => void onEnable()}
        >
          {t('webPushEnable')}
        </Button>
      )}
    </div>
  );

  if (variant === 'section') {
    return (
      <Card>
        <h2 className="mb-4 border-b pb-2 text-xl font-semibold dark:border-gray-700">
          {t('webPushTitle')}
        </h2>
        {body}
      </Card>
    );
  }

  return (
    <div
      className="mb-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 dark:border-primary/30 dark:bg-primary/10"
      role="region"
      aria-label={t('webPushTitle')}
    >
      {body}
    </div>
  );
}
