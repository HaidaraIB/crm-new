import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { getPbxSettingsAPI, markNotificationReadAPI, getNotificationByIdAPI, type AppNotification } from '../services/api';
import { getNotificationDisplay } from '../utils/notificationDisplay';
import { Button } from './Button';
import { PhoneIcon } from './icons';
import { PhoneText } from './PhoneText';
import { queryKeys, useSyncDigest } from '../hooks/useQueries';

const AUTO_DISMISS_MS = 45_000;
const PBX_POP_TYPES = new Set(['pbx_incoming_call', 'pbx_call_missed']);
const SHOWN_STORAGE_KEY = 'pbxScreenPopShownIds';

function loadShownIds(): Set<number> {
  try {
    const raw = sessionStorage.getItem(SHOWN_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map(Number).filter((n) => Number.isFinite(n)));
  } catch {
    return new Set();
  }
}

function persistShownIds(ids: Set<number>) {
  try {
    const list = Array.from(ids).slice(-200);
    sessionStorage.setItem(SHOWN_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore quota / private mode
  }
}

function isPbxScreenPop(n: AppNotification) {
  return PBX_POP_TYPES.has(n.type);
}

/** Shows a non-blocking PBX screen-pop toast from the sync digest. */
export const PbxScreenPopListener = () => {
  const { setCurrentPage, setSelectedLead, t, language } = useAppContext();
  const queryClient = useQueryClient();
  const [active, setActive] = useState<AppNotification | null>(null);
  const shownRef = useRef<Set<number>>(loadShownIds());
  const activeRef = useRef<AppNotification | null>(null);
  const dismissingRef = useRef(false);
  activeRef.current = active;

  const { data: pbxSettings } = useQuery({
    queryKey: ['pbxSettings', 'screen-pop'],
    queryFn: getPbxSettingsAPI,
    staleTime: 60_000,
    retry: false,
  });
  const screenPopActive =
    !!pbxSettings?.is_enabled && pbxSettings.screen_pop_enabled !== false;

  const { data: digest } = useSyncDigest({
    enabled: screenPopActive,
    refetchInterval: false,
  });
  const popId = digest?.pbx_screen_pop?.notification_id;
  const shouldFetchPop =
    screenPopActive && typeof popId === 'number' && !shownRef.current.has(popId);

  const { data: popNotification } = useQuery({
    queryKey: ['notifications', 'pbx-screen-pop', popId],
    queryFn: () => getNotificationByIdAPI(popId!),
    enabled: shouldFetchPop,
  });

  const markShown = useCallback((ids: number[]) => {
    let changed = false;
    for (const id of ids) {
      if (!shownRef.current.has(id)) {
        shownRef.current.add(id);
        changed = true;
      }
    }
    if (changed) persistShownIds(shownRef.current);
  }, []);

  const dismissBacklog = useCallback(
    async (primary: AppNotification | null) => {
      if (dismissingRef.current) return;
      dismissingRef.current = true;
      try {
        const ids = primary ? [primary.id] : popId ? [popId] : [];
        markShown(ids);
        setActive(null);
        await Promise.all(ids.map((id) => markNotificationReadAPI(id).catch(() => null)));
        void queryClient.invalidateQueries({ queryKey: queryKeys.syncDigest });
        void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } finally {
        dismissingRef.current = false;
      }
    },
    [markShown, popId, queryClient]
  );

  useEffect(() => {
    if (!popNotification || dismissingRef.current || activeRef.current) return;
    if (!isPbxScreenPop(popNotification) || popNotification.read) return;
    if (shownRef.current.has(popNotification.id)) return;
    markShown([popNotification.id]);
    setActive(popNotification);
  }, [popNotification, markShown]);

  const dismiss = useCallback(() => {
    void dismissBacklog(activeRef.current);
  }, [dismissBacklog]);

  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [active?.id, dismiss]);

  if (!active) return null;

  const leadId = active.data?.lead_id ?? active.data?.client_id;
  const phone = String(active.data?.phone ?? '').trim();
  const isMissed = active.type === 'pbx_call_missed';
  const display = getNotificationDisplay(active, language);
  const title = display.typeLabel;
  const body = display.body;

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
            {body && body !== title ? (
              <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">{body}</p>
            ) : null}
            {(phone || display.title !== title) ? (
              <PhoneText as="p" className="mt-1 font-mono text-base text-gray-900 dark:text-gray-100">
                {phone || display.title}
              </PhoneText>
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
