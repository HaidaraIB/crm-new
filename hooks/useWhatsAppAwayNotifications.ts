import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAppContext } from '../context/AppContext';
import { getNotificationsAPI } from '../services/api';
import { useWhatsAppUnreadCount } from './useQueries';
import { playIncomingChatSound, preloadIncomingChatSound } from '../utils/chatIncomingSound';

const WHATSAPP_NOTIF_TYPES = new Set([
  'whatsapp_message_received',
  'whatsapp_waiting_response',
]);

/**
 * Away / other-thread WhatsApp alerts use the same sound as team chat
 * (`notification_chat.wav`). Active open-thread inbound plays WhatsApp sound
 * from ChatsPage instead.
 */
export function useWhatsAppAwayNotifications(): void {
  const { currentPage, isLoggedIn, canAccessPage, currentUser } = useAppContext();
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

  const { data: notifPage } = useQuery({
    queryKey: ['notifications', 'whatsapp-sound'],
    queryFn: () => getNotificationsAPI({ page: 1, page_size: 20, read: false }),
    // Away-only signal; on Chats, unread bumps cover other threads.
    enabled: enabled && !isOnChats,
    staleTime: 0,
    refetchInterval: () => {
      if (typeof document !== 'undefined' && document.hidden) return 10_000;
      return 4000;
    },
  });

  const prevUnreadTotalRef = useRef<number | null>(null);
  const prevLatestWaNotifIdRef = useRef<number | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    preloadIncomingChatSound();
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const total = typeof unreadTotal === 'number' ? unreadTotal : 0;
    const results = notifPage?.results ?? [];
    const latestWaId = results
      .filter((n) => WHATSAPP_NOTIF_TYPES.has(String(n.type || '')))
      .reduce((max, n) => (typeof n.id === 'number' && n.id > max ? n.id : max), 0);

    if (!hydratedRef.current) {
      prevUnreadTotalRef.current = total;
      prevLatestWaNotifIdRef.current = latestWaId > 0 ? latestWaId : null;
      hydratedRef.current = true;
      return;
    }

    const unreadBumped = total > (prevUnreadTotalRef.current ?? 0);
    const notifBumped =
      !isOnChats &&
      latestWaId > 0 &&
      prevLatestWaNotifIdRef.current != null &&
      latestWaId > prevLatestWaNotifIdRef.current;

    // Away: chat.wav. On Chats: chat.wav only for unread bumps (other threads);
    // open-thread inbound is handled in ChatsPage with WhatsApp sound.
    if (unreadBumped || notifBumped) {
      playIncomingChatSound();
    }

    prevUnreadTotalRef.current = total;
    if (latestWaId > 0) {
      prevLatestWaNotifIdRef.current = latestWaId;
    }
  }, [unreadTotal, notifPage, enabled, isOnChats]);
}
