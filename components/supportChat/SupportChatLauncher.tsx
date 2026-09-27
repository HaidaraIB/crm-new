import React, { useState } from 'react';

import { useAppContext } from '../../context/AppContext';
import { useSyncDigest } from '../../hooks/useQueries';
import { HeadphonesIcon, XIcon } from '../icons';
import { SupportChatPanel } from './SupportChatPanel';

export const SupportChatLauncher: React.FC = () => {
  const { t, currentUser, isTeamChatDialogOpen } = useAppContext();
  const { data: digest } = useSyncDigest({ enabled: false, refetchInterval: false });
  const [open, setOpen] = useState(false);

  const isOwner = Boolean(
    currentUser?.is_company_owner ?? currentUser?.isCompanyOwner
  );

  if (!isOwner || isTeamChatDialogOpen) {
    return null;
  }

  const unread = digest?.support_chat_unread ?? 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? t('supportChatClose') : t('supportChatOpenBubble')}
        className={`fixed bottom-4 end-4 sm:bottom-6 sm:end-6 z-40 flex items-center gap-2.5 transition-all duration-200 ${
          open
            ? 'h-12 w-12 justify-center rounded-full bg-gray-800 text-white shadow-lg hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600'
            : 'h-14 max-w-[calc(100vw-2rem)] rounded-full bg-primary ps-3.5 pe-4 text-white shadow-[0_8px_28px_rgba(99,102,241,0.45)] hover:scale-[1.02] hover:shadow-[0_10px_32px_rgba(99,102,241,0.5)] ring-2 ring-white/90 dark:ring-gray-900/80'
        }`}
      >
        {open ? (
          <XIcon className="h-5 w-5 shrink-0" />
        ) : (
          <>
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
              <HeadphonesIcon className="h-5 w-5" aria-hidden />
              {unread > 0 ? (
                <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none ring-2 ring-primary">
                  {unread > 99 ? '99+' : unread}
                </span>
              ) : null}
            </span>
            <span className="min-w-0 truncate text-sm font-semibold tracking-tight">
              {t('supportChatLauncherLabel')}
            </span>
          </>
        )}
      </button>
      <SupportChatPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
};
