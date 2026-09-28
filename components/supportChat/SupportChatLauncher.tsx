import React, { useEffect, useState } from 'react';

import { useAppContext } from '../../context/AppContext';
import { useSyncDigest } from '../../hooks/useQueries';
import { HeadphonesIcon, XIcon } from '../icons';
import { SupportChatPanel } from './SupportChatPanel';

const STORAGE_PREFIX = 'loopSupportLauncherMinimized';

type StoredDismiss = { unread: number };

function storageKey(userId: number) {
  return `${STORAGE_PREFIX}:${userId}`;
}

function readDismiss(userId: number): StoredDismiss | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDismiss;
    if (typeof parsed?.unread !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeDismiss(userId: number, unread: number) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify({ unread }));
  } catch {
    /* private mode / quota */
  }
}

function clearDismiss(userId: number) {
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    /* private mode / quota */
  }
}

export const SupportChatLauncher: React.FC = () => {
  const { t, currentUser, isTeamChatDialogOpen } = useAppContext();
  const { data: digest } = useSyncDigest({ enabled: false, refetchInterval: false });
  const userId = currentUser?.id;
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(() =>
    userId != null ? readDismiss(userId) != null : false
  );
  const [baselineUnread, setBaselineUnread] = useState<number | null>(() =>
    userId != null ? (readDismiss(userId)?.unread ?? null) : null
  );

  const isOwner = Boolean(
    currentUser?.is_company_owner ?? currentUser?.isCompanyOwner
  );
  const unreadKnown = digest != null;
  const unread = digest?.support_chat_unread ?? 0;

  useEffect(() => {
    if (userId == null) return;
    const stored = readDismiss(userId);
    setMinimized(stored != null);
    setBaselineUnread(stored?.unread ?? null);
  }, [userId]);

  useEffect(() => {
    if (!minimized || baselineUnread == null || userId == null || !unreadKnown) return;
    if (unread > baselineUnread) {
      setMinimized(false);
      setBaselineUnread(null);
      clearDismiss(userId);
      return;
    }
    if (unread < baselineUnread) {
      setBaselineUnread(unread);
      writeDismiss(userId, unread);
    }
  }, [unread, unreadKnown, minimized, baselineUnread, userId]);

  const hideLauncher = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen(false);
    setMinimized(true);
    setBaselineUnread(unread);
    if (userId != null) writeDismiss(userId, unread);
  };

  if (!isOwner || isTeamChatDialogOpen) {
    return null;
  }

  const showLabeledPill = !open && !minimized;

  return (
    <>
      <div className="group fixed bottom-4 end-4 sm:bottom-6 sm:end-6 z-40">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? t('supportChatClose') : t('supportChatOpenBubble')}
          title={showLabeledPill ? undefined : t('supportChatLauncherLabel')}
          className={`flex items-center transition-all duration-200 ${
            open
              ? 'h-12 w-12 justify-center rounded-full bg-gray-800 text-white shadow-lg hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600'
              : minimized
                ? 'h-12 w-12 justify-center rounded-full border border-gray-200 bg-white text-primary shadow-md hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700'
                : 'h-14 max-w-[calc(100vw-2rem)] gap-2.5 rounded-full bg-primary ps-3.5 pe-4 text-white shadow-[0_8px_28px_rgba(99,102,241,0.45)] hover:scale-[1.02] hover:shadow-[0_10px_32px_rgba(99,102,241,0.5)] ring-2 ring-white/90 dark:ring-gray-900/80'
          }`}
        >
          {open ? (
            <XIcon className="h-5 w-5 shrink-0" />
          ) : (
            <>
              <span
                className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  minimized ? 'bg-primary/10 dark:bg-white/10' : 'bg-white/20'
                }`}
              >
                <HeadphonesIcon className="h-5 w-5" aria-hidden />
                {unread > 0 ? (
                  <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none ring-2 ring-primary">
                    {unread > 99 ? '99+' : unread}
                  </span>
                ) : null}
              </span>
              {showLabeledPill ? (
                <span className="min-w-0 truncate text-sm font-semibold tracking-tight">
                  {t('supportChatLauncherLabel')}
                </span>
              ) : null}
            </>
          )}
        </button>
        {showLabeledPill ? (
          <button
            type="button"
            onClick={hideLauncher}
            aria-label={t('supportChatHideLauncher')}
            title={t('supportChatHideLauncher')}
            className="absolute -top-2.5 -start-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-gray-200/90 bg-white text-gray-600 shadow-md transition-colors hover:bg-gray-50 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            <XIcon className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
      <SupportChatPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
};
