import { useEffect, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { useWhatsAppUnreadCount } from './useQueries';
import { playIncomingWhatsAppSound, preloadIncomingWhatsAppSound } from '../utils/whatsappIncomingSound';

/**
 * Polls WhatsApp unread when the user is not on Chats and plays the notification sound
 * when total unread increases. On Chats, no sound (in-thread UX stays quiet).
 */
export function useWhatsAppAwayNotifications(): void {
  const { currentPage, isLoggedIn, canAccessPage, currentUser } = useAppContext();
  const enabled = Boolean(isLoggedIn && currentUser && canAccessPage('Chats'));
  const isOnChats = currentPage === 'Chats';

  const { data: unreadTotal = 0 } = useWhatsAppUnreadCount({
    enabled,
    refetchInterval: () => {
      if (typeof document !== 'undefined' && document.hidden) return false;
      if (isOnChats) return false;
      return 2000;
    },
  });

  const prevUnreadTotalRef = useRef<number | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    preloadIncomingWhatsAppSound();
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const total = typeof unreadTotal === 'number' ? unreadTotal : 0;

    if (isOnChats) {
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
      playIncomingWhatsAppSound();
    }
    prevUnreadTotalRef.current = total;
  }, [unreadTotal, enabled, isOnChats]);
}
