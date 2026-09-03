/**
 * Typing / recording / uploading presence for one chat thread.
 *
 * Presence is the clearest case for a socket in this product: it is ephemeral,
 * it changes at keystroke rate, it is worthless a few seconds late, and it never
 * touches the database. Polling it meant a GET every 2.5s per open thread plus a
 * POST every 3.2s while anyone was typing — constant traffic to answer "still
 * nothing" — and it still arrived up to two and a half seconds late.
 *
 * The socket carries it instead, and the HTTP path stays underneath: with no
 * connection this behaves exactly as it did before. That is why the poll is
 * merely slowed rather than deleted when the socket is healthy — 15s is a safety
 * net against a socket that is open but not delivering, which is a failure the
 * client cannot otherwise detect.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  onRealtimeFrame,
  onRealtimeStatus,
  sendRealtime,
  subscribeToConversation,
} from './useRealtimeChannel';
import type { TenantChatPeerPresenceAction } from '../services/api';

/** Server drops presence after 12s; expire slightly sooner so it never sticks. */
const PRESENCE_EXPIRY_MS = 10_000;

export type PeerPresence = { userId: number; state: TenantChatPeerPresenceAction };

/**
 * Peer presence for `conversationId`, delivered over the socket.
 *
 * Returns the peers currently active, and a `sendPresence` that reports this
 * user's own state. `socketDelivering` tells the caller whether the HTTP poll
 * can be backed off — it only goes true once a subscription has actually been
 * sent, never merely because a socket exists.
 */
export function useConversationPresence(conversationId: number | null): {
  peers: PeerPresence[];
  sendPresence: (state: TenantChatPeerPresenceAction) => boolean;
  socketDelivering: boolean;
} {
  const [peers, setPeers] = useState<PeerPresence[]>([]);
  const [socketDelivering, setSocketDelivering] = useState(false);
  // Keyed by user id so a second frame from the same person replaces the first
  // rather than stacking.
  const seenAtRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    setPeers([]);
    seenAtRef.current.clear();
    setSocketDelivering(false);
    if (conversationId == null) return;

    // Connection and interest can arrive in either order; the shared helper
    // replays the subscribe when the socket comes up, so all this has to track
    // is whether frames are reaching us yet.
    const subscription = subscribeToConversation(conversationId);
    setSocketDelivering(subscription.delivered);

    const unsubscribeStatus = onRealtimeStatus((connected) => {
      // Down: fall back to polling immediately rather than sitting on the
      // backed-off interval waiting for frames that cannot arrive.
      setSocketDelivering(connected);
    });

    const unsubscribeFrames = onRealtimeFrame((frame) => {
      if (frame.scope !== 'presence' || frame.conversation !== conversationId) return;
      const userId = frame.user_id;
      const state = frame.state as TenantChatPeerPresenceAction | undefined;
      if (typeof userId !== 'number' || !state) return;

      // 'idle' is a clear, not a state to display.
      if (state === 'idle') {
        seenAtRef.current.delete(userId);
      } else {
        seenAtRef.current.set(userId, Date.now());
      }
      setPeers((previous) => {
        const others = previous.filter((peer) => peer.userId !== userId);
        return state === 'idle' ? others : [...others, { userId, state }];
      });
    });

    // Presence has no "stopped" event when a tab simply closes, so entries have
    // to age out or a colleague would appear to be typing forever.
    const expiry = window.setInterval(() => {
      const cutoff = Date.now() - PRESENCE_EXPIRY_MS;
      let changed = false;
      seenAtRef.current.forEach((seenAt, userId) => {
        if (seenAt < cutoff) {
          seenAtRef.current.delete(userId);
          changed = true;
        }
      });
      if (changed) {
        setPeers((previous) =>
          previous.filter((peer) => seenAtRef.current.has(peer.userId))
        );
      }
    }, 2_000);

    return () => {
      window.clearInterval(expiry);
      unsubscribeFrames();
      unsubscribeStatus();
      subscription.release();
    };
  }, [conversationId]);

  const sendPresence = useCallback(
    (state: TenantChatPeerPresenceAction) => {
      if (conversationId == null) return false;
      const sent = sendRealtime({
        action: 'presence',
        conversation: conversationId,
        state,
      });
      // A failed send means no socket; the caller posts over HTTP instead.
      if (!sent) setSocketDelivering(false);
      return sent;
    },
    [conversationId]
  );

  return { peers, sendPresence, socketDelivering };
}
