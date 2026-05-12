import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { getTenantChatConversationsAPI } from '../services/api';
import { playIncomingChatSound, preloadIncomingChatSound } from '../utils/chatIncomingSound';

/**
 * Polls conversations when the user is not on Team Chat and plays the notification sound
 * when total unread increases. On Team Chat, no sound (in-thread UX stays quiet).
 */
export function useTeamChatAwayNotifications(): void {
  const { currentPage, isLoggedIn, canAccessPage, currentUser, isTeamChatDialogOpen } = useAppContext();
  const enabled = Boolean(isLoggedIn && currentUser && canAccessPage('Team Chat'));
  const isOnTeamChat = currentPage === 'Team Chat' || isTeamChatDialogOpen;

  const { data } = useQuery({
    queryKey: ['tenant-chat-conversations'],
    queryFn: () => getTenantChatConversationsAPI(),
    enabled,
    refetchInterval: () => {
      if (typeof document !== 'undefined' && document.hidden) return false;
      if (isOnTeamChat) return false;
      return 2000;
    },
  });

  const prevUnreadTotalRef = useRef<number | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    preloadIncomingChatSound();
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const total = (data?.results ?? []).reduce((sum, c) => sum + (c.unread_count ?? 0), 0);

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
  }, [data, enabled, isOnTeamChat]);
}
