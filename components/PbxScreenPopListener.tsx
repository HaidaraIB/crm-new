import React, { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { getNotificationsAPI, getPbxSettingsAPI, markNotificationReadAPI, type AppNotification } from '../services/api';
import { Button } from './Button';
import { PhoneIcon } from './icons';

const AUTO_DISMISS_MS = 45_000;

/** Polls for PBX incoming-call notifications and shows a non-blocking screen-pop toast. */
export const PbxScreenPopListener = () => {
  const { setCurrentPage, setSelectedLead, t } = useAppContext();
  const [active, setActive] = useState<AppNotification | null>(null);
  const shownRef = useRef<Set<number>>(new Set());
  const activeRef = useRef<AppNotification | null>(null);
  activeRef.current = active;

  const { data: pbxSettings } = useQuery({
    queryKey: ['pbxSettings', 'screen-pop'],
    queryFn: getPbxSettingsAPI,
    staleTime: 60_000,
    retry: false,
  });
  const screenPopActive =
    !!pbxSettings?.is_enabled && pbxSettings.screen_pop_enabled !== false;

  const { data } = useQuery({
    queryKey: ['notifications', 'pbx-screen-pop'],
    queryFn: () => getNotificationsAPI({ page: 1, page_size: 20 }),
    refetchInterval: screenPopActive ? 8000 : false,
    enabled: screenPopActive,
  });

  useEffect(() => {
    const items = data?.results ?? [];
    const incoming = items.find(
      (n) =>
        !n.read &&
        (n.type === 'pbx_incoming_call' || n.type === 'pbx_call_missed') &&
        !shownRef.current.has(n.id)
    );
    if (incoming) {
      shownRef.current.add(incoming.id);
      setActive(incoming);
    }
  }, [data]);

  const dismiss = () => {
    const current = activeRef.current;
    if (current && !current.read) markNotificationReadAPI(current.id).catch(() => {});
    setActive(null);
  };

  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [active?.id]);

  if (!active) return null;

  const leadId = active.data?.lead_id ?? active.data?.client_id;
  const phone = active.data?.phone ?? '';
  const isMissed = active.type === 'pbx_call_missed';
  const title = leadId && active.title
    ? active.title
    : (isMissed ? t('pbxMissedCall') : t('incomingCall'));
  const body = leadId
    ? (active.body || phone)
    : (isMissed ? t('pbxMissedCallFrom') : t('incomingCallFrom')).replace(
        '{phone}',
        phone || active.body || ''
      );

  const openLead = () => {
    if (leadId) {
      setSelectedLead({ id: Number(leadId) } as any);
      setCurrentPage('ViewLead');
    }
    dismiss();
  };

  return (
    <div
      className="pointer-events-none fixed bottom-0 end-0 z-[90] p-4 sm:p-6"
      aria-live="polite"
    >
      <div
        role="status"
        className={`pointer-events-auto w-[min(100vw-2rem,24rem)] overflow-hidden rounded-xl border shadow-xl backdrop-blur-sm ${
          isMissed
            ? 'border-amber-300/80 bg-white/95 dark:border-amber-700/60 dark:bg-gray-900/95'
            : 'border-emerald-300/80 bg-white/95 dark:border-emerald-700/60 dark:bg-gray-900/95'
        }`}
      >
        <div className="flex items-start gap-3 p-4">
          <div
            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              isMissed
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
            }`}
          >
            <PhoneIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
            <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">{body}</p>
            {phone ? (
              <p className="mt-1 font-mono text-base text-gray-900 dark:text-gray-100" dir="ltr">
                {phone}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" className="h-8 px-3 text-xs" onClick={dismiss}>
                {t('dismiss')}
              </Button>
              {leadId ? (
                <Button className="h-8 px-3 text-xs" onClick={openLead}>
                  {t('openLead')}
                </Button>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label={t('dismiss')}
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};
