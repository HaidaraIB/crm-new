import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { queryKeys, useSyncDigest } from './useQueries';
import { useWhatsAppChatsAllowed } from './useWhatsAppChatsAllowed';
import { playIncomingChatSound, preloadIncomingChatSound } from '../utils/chatIncomingSound';

/**
 * Away / other-thread WhatsApp alerts use the same sound as team chat
 * (`notification_chat.wav`). Active open-thread inbound plays WhatsApp sound
 * from ChatsPage instead. Does not use the bell notification inbox.
 */
export function useWhatsAppAwayNotifications(): void {
  const { currentPage, isLoggedIn, canAccessPage, currentUser } = useAppContext();
  const queryClient = useQueryClient();
  const chatsAllowed = useWhatsAppChatsAllowed();
  const enabled = Boolean(isLoggedIn && currentUser && canAccessPage('Chats') && chatsAllowed);
  const isOnChats = currentPage === 'Chats';

  const { data } = useSyncDigest({ enabled });
  const unreadTotal = typeof data?.whatsapp_unread === 'number' ? data.whatsapp_unread : 0;

  const prevUnreadTotalRef = useRef<number | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    preloadIncomingChatSound();
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const total = unreadTotal;

    if (!hydratedRef.current) {
      prevUnreadTotalRef.current = total;
      hydratedRef.current = true;
      return;
    }

    const unreadBumped = total > (prevUnreadTotalRef.current ?? 0);

    if (unreadBumped) {
      playIncomingChatSound();
      void queryClient.invalidateQueries({ queryKey: queryKeys.whatsAppConversations });
    }

    prevUnreadTotalRef.current = total;
  }, [unreadTotal, enabled, isOnChats, queryClient]);
}
