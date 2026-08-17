import { useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { playIncomingChatSound, preloadIncomingChatSound } from '../utils/chatIncomingSound';
import { useSyncDigest } from './useQueries';

/**
 * Uses the sync digest when the user is not on Team Chat and plays the notification sound
 * when total unread increases. On Team Chat, no sound (in-thread UX stays quiet).
 */
export function useTeamChatAwayNotifications(): void {
  const { currentPage, isLoggedIn, canAccessPage, currentUser, isTeamChatDialogOpen } = useAppContext();
  const enabled = Boolean(isLoggedIn && currentUser && canAccessPage('Team Chat'));
  const isOnTeamChat = currentPage === 'Team Chat' || isTeamChatDialogOpen;

  const { data } = useSyncDigest({ enabled });
  const total = data?.tenant_chat_unread ?? 0;

  const prevUnreadTotalRef = useRef<number | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    preloadIncomingChatSound();
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    if (isOnTeamChat) {
      prevUnreadTotalRef.current = total;
      hydratedRef.current = true;
      return;
    }

    if (!hydratedRef.current) {
      prevUnreadTotalRef.current = total;
      hydratedRef.current = true;
      return;
    }

    if (total > (prevUnreadTotalRef.current ?? 0)) {
      playIncomingChatSound();
    }
    prevUnreadTotalRef.current = total;
  }, [total, enabled, isOnTeamChat]);
}
