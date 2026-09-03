/**
 * Keep one open chat thread current from the realtime channel.
 *
 * The digest already carries a `tenant_chat` slice, and the thread already polls
 * — so why a third signal? Because neither covers the event this exists for. The
 * slice counter is bumped by ChatMessage writes only, and a read cursor moving
 * writes no message: it changes nothing except what the *other* participant sees
 * on the bubbles they already sent. So a "seen" tick had two ways to appear —
 * the thread's own poll, which backs off to 30s precisely when a socket is
 * healthy, or the next message happening to arrive — and both read as a stuck
 * tick to the person waiting on it.
 *
 * The server now sends a `conversation` frame whenever a thread's contents or
 * either participant's cursor move. Like every frame on this channel it carries
 * a version and no data; the refetch below goes through the ordinary endpoint,
 * which filters by participation and answers 304 when nothing really changed.
 *
 * The poll is not removed, only left as the backstop it became: a socket that is
 * open but silently not delivering is a failure this client cannot detect.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { onRealtimeFrame, subscribeToConversation } from './useRealtimeChannel';

export function useConversationThreadSync(conversationId: number | null): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (conversationId == null) return;

    // Reference counted, so this and useConversationPresence can both hold the
    // same subscription without either's cleanup silencing the other.
    const subscription = subscribeToConversation(conversationId);

    const unsubscribeFrames = onRealtimeFrame((frame) => {
      if (frame.scope !== 'conversation' || frame.conversation !== conversationId) return;
      void queryClient.invalidateQueries({
        queryKey: ['tenant-chat-messages', conversationId],
      });
      // The row's own unread count and last-read cursor live on the conversation
      // list, which the thread reads back for the peer's cursor.
      void queryClient.invalidateQueries({ queryKey: ['tenant-chat-conversations'] });
    });

    return () => {
      unsubscribeFrames();
      subscription.release();
    };
  }, [conversationId, queryClient]);
}
