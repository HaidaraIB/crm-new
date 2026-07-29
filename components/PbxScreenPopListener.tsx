import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { getNotificationsAPI, getPbxSettingsAPI, markNotificationReadAPI, type AppNotification } from '../services/api';
import { getNotificationDisplay } from '../utils/notificationDisplay';
import { Button } from './Button';
import { PhoneIcon } from './icons';
import { PhoneText } from './PhoneText';

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
    // Cap size so sessionStorage does not grow forever
    const list = Array.from(ids).slice(-200);
    sessionStorage.setItem(SHOWN_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore quota / private mode
  }
}

function isPbxScreenPop(n: AppNotification) {
  return PBX_POP_TYPES.has(n.type);
}

/** Polls for PBX incoming-call notifications and shows a non-blocking screen-pop toast. */
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

  const queryKey = ['notifications', 'pbx-screen-pop'] as const;

  const { data } = useQuery({
    queryKey,
    queryFn: () => getNotificationsAPI({ page: 1, page_size: 50 }),
    refetchInterval: screenPopActive ? 8000 : false,
    enabled: screenPopActive,
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

  // One-shot: if a backlog of unread PBX pops accumulated (e.g. webhook retries),
  // keep only the newest for display and mark the rest read so dismiss isn't a loop.
  const prunedRef = useRef(false);
  useEffect(() => {
    if (!data?.results || prunedRef.current || dismissingRef.current) return;
    const unread = (data.results as AppNotification[])
      .filter((n) => isPbxScreenPop(n) && !n.read && !shownRef.current.has(n.id))
      .sort((a, b) => b.id - a.id);
    if (unread.length <= 1) {
      if (unread.length === 1 || (data.results as AppNotification[]).some(isPbxScreenPop)) {
        prunedRef.current = true;
      }
      return;
    }
    prunedRef.current = true;
    const [, ...stale] = unread;
    const staleIds = stale.map((n) => n.id);
    markShown(staleIds);
    queryClient.setQueryData(queryKey, (prev: typeof data) => {
      if (!prev?.results) return prev;
      const cleared = new Set(staleIds);
      return {
        ...prev,
        results: prev.results.map((n) =>
          cleared.has(n.id) ? { ...n, read: true } : n
        ),
      };
    });
    void Promise.all(staleIds.map((id) => markNotificationReadAPI(id).catch(() => null)));
  }, [data, markShown, queryClient]);

  const dismissBacklog = useCallback(
    async (primary: AppNotification | null) => {
      if (dismissingRef.current) return;
      dismissingRef.current = true;
      try {
        const items = data?.results ?? [];
        const pending = items.filter(
          (n) => isPbxScreenPop(n) && !n.read && !shownRef.current.has(n.id)
        );
        const toClear = new Map<number, AppNotification>();
        if (primary) toClear.set(primary.id, primary);
        for (const n of pending) toClear.set(n.id, n);
        // Also clear any other unread PBX pops already marked shown but still unread
        for (const n of items) {
          if (isPbxScreenPop(n) && !n.read) toClear.set(n.id, n);
        }

        const ids = Array.from(toClear.keys());
        markShown(ids);
        setActive(null);

        queryClient.setQueryData(queryKey, (prev: typeof data) => {
          if (!prev?.results) return prev;
          const cleared = new Set(ids);
          return {
            ...prev,
            results: prev.results.map((n) =>
              cleared.has(n.id) ? { ...n, read: true } : n
            ),
          };
        });

        await Promise.all(
          ids.map((id) => markNotificationReadAPI(id).catch(() => null))
        );
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } finally {
        dismissingRef.current = false;
      }
    },
    [data, markShown, queryClient]
  );

  useEffect(() => {
    if (!data || dismissingRef.current || activeRef.current) return;
    const items = data.results ?? [];
    // Newest first if API returns oldest-first
    const incoming = [...items]
      .filter(
        (n) => isPbxScreenPop(n) && !n.read && !shownRef.current.has(n.id)
      )
      .sort((a, b) => b.id - a.id)[0];
    if (incoming) {
      markShown([incoming.id]);
      setActive(incoming);
    }
  }, [data, markShown]);

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
