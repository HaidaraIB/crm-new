import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { queryKeys, useWhatsAppUnreadCount } from './useQueries';
import { playIncomingChatSound, preloadIncomingChatSound } from '../utils/chatIncomingSound';

/**
 * Away / other-thread WhatsApp alerts use the same sound as team chat
 * (`notification_chat.wav`). Active open-thread inbound plays WhatsApp sound
 * from ChatsPage instead. Does not use the bell notification inbox.
 */
export function useWhatsAppAwayNotifications(): void {
  const { currentPage, isLoggedIn, canAccessPage, currentUser } = useAppContext();
  const queryClient = useQueryClient();
  const enabled = Boolean(isLoggedIn && currentUser && canAccessPage('Chats'));
  const isOnChats = currentPage === 'Chats';

  const { data: unreadTotal = 0 } = useWhatsAppUnreadCount({
    enabled,
    refetchInterval: () => {
      if (typeof document !== 'undefined' && document.hidden) return 10_000;
      // Keep polling on Chats so other conversations can ding with chat.wav.
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
    const total = typeof unreadTotal === 'number' ? unreadTotal : 0;

    if (!hydratedRef.current) {
      prevUnreadTotalRef.current = total;
      hydratedRef.current = true;
      return;
    }

    const unreadBumped = total > (prevUnreadTotalRef.current ?? 0);

    // Away: chat.wav. On Chats: chat.wav for unread bumps (other threads);
    // open-thread inbound is handled in ChatsPage with WhatsApp sound.
    if (unreadBumped) {
      playIncomingChatSound();
      // Keep conversation list badges/previews in sync with the faster unread poll.
      void queryClient.invalidateQueries({ queryKey: queryKeys.whatsAppConversations });
    }

    prevUnreadTotalRef.current = total;
  }, [unreadTotal, enabled, isOnChats, queryClient]);
}
