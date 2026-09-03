/**
 * WebSocket delivery for the sync digest.
 *
 * The digest is already the app's change feed (see useSliceVersion) — this makes
 * it arrive when something happens instead of on a five-second timer. The socket
 * carries no data: a frame says only "scope X is now at version N", and the tab
 * responds by refetching the digest through the ordinary authenticated endpoint.
 *
 * That indirection is deliberate. WhatsApp chat and call visibility is per-user,
 * and the server pushes to company-wide groups; if frames carried payloads, every
 * ACL rule would have to be reimplemented on the socket, and getting it wrong
 * would show one colleague another's leads. Pushing a version number instead
 * means group membership is the whole authorization surface and the data still
 * comes through views that already filter it.
 *
 * Polling is not removed, only slowed — see REALTIME_DIGEST_INTERVAL. If the
 * socket is down, misconfigured, or the server does not support it, the app keeps
 * working exactly as it did before, just less promptly. Every code path here
 * fails toward that fallback.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { queryKeys } from './useQueries';
import { BASE_URL } from '../services/api';

/** Digest poll interval while the socket is healthy — a heartbeat, not the mechanism. */
export const REALTIME_DIGEST_INTERVAL = 30_000;
/** Digest poll interval with no socket. The pre-realtime behaviour. */
export const FALLBACK_DIGEST_INTERVAL = 5_000;

const CHANNEL_NAME = 'crm-realtime';
const LEADER_KEY = 'crm_realtime_leader';
/** Leader renews within this; a lease older than twice it is treated as abandoned. */
const LEASE_RENEW_MS = 2_000;
const LEASE_STALE_MS = LEASE_RENEW_MS * 3;

const MIN_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

/**
 * Off unless explicitly enabled, so the client can ship before the server does.
 *
 * Without this the socket would retry against a server with no /ws/ route for the
 * life of every tab. Mirrors PUSH_QUEUE_ENABLED on the backend: the two halves
 * deploy in either order, and it can be switched off without a rebuild.
 */
const REALTIME_ENABLED =
  String(import.meta.env.VITE_REALTIME_ENABLED ?? '').toLowerCase() === 'true';

/**
 * Say out loud what realtime is doing.
 *
 * Silence was the worst property of the first version: with the flag unset the
 * socket simply never opened, and the only evidence was an absence — no `/ws/`
 * line in the server log — which is indistinguishable from a routing or auth
 * problem. Vite reads .env once at startup, so the most common cause is an edited
 * .env with no dev-server restart, and that is invisible from the server side.
 *
 * Logged once per page load, never in production builds.
 */
function realtimeLog(message: string, ...rest: unknown[]): void {
  if (import.meta.env.PROD) return;
  console.info(`[realtime] ${message}`, ...rest);
}

let announcedConfig = false;
function announceConfigOnce(): void {
  if (announcedConfig) return;
  announcedConfig = true;
  if (!REALTIME_ENABLED) {
    realtimeLog(
      `disabled — VITE_REALTIME_ENABLED is ${JSON.stringify(
        import.meta.env.VITE_REALTIME_ENABLED ?? null
      )}, expected "true". Vite reads .env at startup, so restart the dev server after editing it. Falling back to ${FALLBACK_DIGEST_INTERVAL}ms digest polling.`
    );
    return;
  }
  realtimeLog('enabled, target', realtimeUrl());
}

/** http(s)://host/api/v1 -> ws(s)://host/ws/sync/ */
function realtimeUrl(): string | null {
  const explicit = import.meta.env.VITE_REALTIME_URL;
  if (explicit) return String(explicit);
  if (!BASE_URL) return null;
  try {
    const url = new URL(BASE_URL, window.location.origin);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws/sync/';
    url.search = '';
    return url.toString();
  } catch {
    return null;
  }
}

type TabRole = 'leader' | 'follower';

function readLease(): { id: string; at: number } | null {
  try {
    const raw = localStorage.getItem(LEADER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { id?: unknown; at?: unknown };
    if (typeof parsed?.id !== 'string' || typeof parsed?.at !== 'number') return null;
    return { id: parsed.id, at: parsed.at };
  } catch {
    return null;
  }
}

/**
 * Elect one socket per browser, not per tab.
 *
 * A CRM user keeps several tabs open, and without this each would hold its own
 * connection to receive identical frames. The lease is a timestamp in
 * localStorage that the leader renews; any tab may claim it once it goes stale,
 * which is what recovers the socket when the leader tab is closed or crashes.
 */
function useTabRole(enabled: boolean): TabRole {
  const [role, setRole] = useState<TabRole>('follower');
  const tabIdRef = useRef<string>(
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  );

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      setRole('follower');
      return;
    }
    const myId = tabIdRef.current;

    const claimOrRenew = () => {
      const lease = readLease();
      const now = Date.now();
      const mine = lease?.id === myId;
      const stale = !lease || now - lease.at > LEASE_STALE_MS;
      if (mine || stale) {
        try {
          localStorage.setItem(LEADER_KEY, JSON.stringify({ id: myId, at: now }));
          setRole('leader');
          return;
        } catch {
          // Storage unavailable (private mode, quota). Every tab then stays a
          // follower and nobody opens a socket — the digest poll still runs, so
          // this degrades to the pre-realtime behaviour rather than breaking.
        }
      }
      setRole('follower');
    };

    claimOrRenew();
    const timer = window.setInterval(claimOrRenew, LEASE_RENEW_MS);

    const release = () => {
      const lease = readLease();
      if (lease?.id !== myId) return;
      try {
        // Free the lease immediately instead of making the next tab wait out the
        // staleness window.
        localStorage.removeItem(LEADER_KEY);
      } catch {
        // ignore
      }
    };
    window.addEventListener('pagehide', release);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pagehide', release);
      release();
    };
  }, [enabled]);

  return role;
}

/**
 * Keep this tab's digest fresh from the realtime channel.
 *
 * Returns the interval the digest poll should use, so the caller can slow the
 * timer while the socket is carrying events and speed it back up when it is not.
 */
/**
 * A frame the server pushed that is not a version bump — currently presence.
 *
 * Version frames are handled internally (they trigger a digest refetch); these
 * are handed to feature code, which is what lets a view react to something the
 * digest cannot express.
 */
export type RealtimeFrame = {
  scope: string;
  conversation?: number;
  user_id?: number;
  state?: string;
};

type OutboundPayload = Record<string, unknown>;

/**
 * Module-level so every tab — leader or follower — shares one set of handlers and
 * one outbound path. The socket itself still belongs to the leader alone; these
 * are the seams that let the rest of the app reach it.
 */
const frameHandlers = new Set<(frame: RealtimeFrame) => void>();
let leaderSend: ((payload: OutboundPayload) => boolean) | null = null;

/**
 * Whether *some* tab in this browser currently holds an open socket.
 *
 * Followers cannot see the connection, so without this a relayed send would
 * always report success — and a caller that backs its polling off on that
 * signal would go quiet while nothing was actually being delivered. The leader
 * sets it directly; followers learn it from the same `status` broadcast that
 * drives their digest interval.
 */
let socketConnected = false;

/**
 * Notified whenever the browser's socket comes up or goes down.
 *
 * Needed because connection and interest arrive in either order: a thread can be
 * opened before the socket finishes connecting, in which case its subscribe
 * would be dropped and that feature would stay dark until the user navigated
 * away and back. Subscribers re-establish themselves on the way up.
 */
const statusHandlers = new Set<(connected: boolean) => void>();

function setSocketConnected(next: boolean): void {
  if (socketConnected === next) return;
  socketConnected = next;
  statusHandlers.forEach((handler) => {
    try {
      handler(next);
    } catch {
      // A failing subscriber must not stop the others being told.
    }
  });
}

/** Subscribe to socket up/down. Returns an unsubscribe function. */
export function onRealtimeStatus(handler: (connected: boolean) => void): () => void {
  statusHandlers.add(handler);
  return () => {
    statusHandlers.delete(handler);
  };
}

/** Whether a socket is currently available for sends. */
export function isRealtimeConnected(): boolean {
  return REALTIME_ENABLED && socketConnected;
}

/**
 * Reactive form of the above, for views that change behaviour when the socket
 * comes and goes — typically to back a fallback poll off while it is healthy and
 * tighten it again the moment it is not.
 */
export function useRealtimeConnected(): boolean {
  const [connected, setConnectedState] = useState(isRealtimeConnected);
  useEffect(() => {
    setConnectedState(isRealtimeConnected());
    return onRealtimeStatus(() => setConnectedState(isRealtimeConnected()));
  }, []);
  return connected;
}

function dispatchFrame(frame: RealtimeFrame): void {
  frameHandlers.forEach((handler) => {
    try {
      handler(frame);
    } catch {
      // One bad subscriber must not stop the others receiving the frame.
    }
  });
}

/**
 * Subscribe to non-version frames. Returns an unsubscribe function.
 *
 * Safe to call whether or not a socket exists; with none, no frames arrive and
 * the caller falls back to whatever it did before.
 */
export function onRealtimeFrame(handler: (frame: RealtimeFrame) => void): () => void {
  frameHandlers.add(handler);
  return () => {
    frameHandlers.delete(handler);
  };
}

/**
 * Send a frame to the server. Returns false when there is no socket to send on,
 * which is the caller's signal to use its HTTP fallback instead.
 *
 * Only the leader tab holds a connection, so a follower relays through
 * BroadcastChannel rather than opening a second one — the "one socket per
 * browser" rule holds for writes as well as reads.
 */
export function sendRealtime(payload: OutboundPayload): boolean {
  // Never claim success when realtime is off or no tab holds a connection.
  // Callers use the return value to decide whether they may back off their own
  // polling, so a false positive here silently stops a feature updating.
  if (!REALTIME_ENABLED || !socketConnected) return false;
  if (leaderSend) return leaderSend(payload);
  if (typeof window === 'undefined') return false;
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage({ type: 'send', payload });
    channel.close();
    // Optimistic: a relayed send cannot be confirmed from here. The leader is
    // alive (it renews its lease every 2s) or another tab has taken over, and
    // presence is disposable — a dropped keystroke signal costs nothing.
    return true;
  } catch {
    return false;
  }
}

/**
 * Conversation subscriptions, reference counted.
 *
 * Two independent hooks now care about the same thread — presence and thread
 * sync — and the server tracks admission per connection, not per subscriber. So
 * whichever of them unmounted first used to unsubscribe the other along with
 * itself, and the surviving hook went silent with no way to notice. Counting
 * means the wire sees one subscribe on the first interested caller and one
 * unsubscribe when the last one leaves.
 *
 * Subscriptions live on the connection, so they are replayed on every reconnect.
 */
const conversationSubscribers = new Map<number, number>();

if (typeof window !== 'undefined') {
  onRealtimeStatus((connected) => {
    if (!connected) return;
    conversationSubscribers.forEach((_count, conversationId) => {
      sendRealtime({ action: 'subscribe', conversation: conversationId });
    });
  });
}

/**
 * Ask the server for frames about one conversation. Returns an unsubscribe
 * function, and whether the subscribe actually reached a socket — callers use
 * that to decide whether they may back their HTTP polling off.
 */
export function subscribeToConversation(conversationId: number): {
  delivered: boolean;
  release: () => void;
} {
  const previous = conversationSubscribers.get(conversationId) ?? 0;
  conversationSubscribers.set(conversationId, previous + 1);
  // Only the first subscriber puts anything on the wire; later ones inherit the
  // admission the server already granted this connection.
  const delivered =
    previous > 0
      ? isRealtimeConnected()
      : sendRealtime({ action: 'subscribe', conversation: conversationId });

  let released = false;
  return {
    delivered,
    release: () => {
      if (released) return;
      released = true;
      const count = (conversationSubscribers.get(conversationId) ?? 1) - 1;
      if (count > 0) {
        conversationSubscribers.set(conversationId, count);
        return;
      }
      conversationSubscribers.delete(conversationId);
      sendRealtime({ action: 'unsubscribe', conversation: conversationId });
    },
  };
}

export function useRealtimeChannel(enabled: boolean): { digestInterval: number } {
  const queryClient = useQueryClient();
  const active = enabled && REALTIME_ENABLED;
  const role = useTabRole(active);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (enabled) announceConfigOnce();
  }, [enabled]);

  const refreshDigest = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.syncDigest });
  }, [queryClient]);

  // Followers learn from the leader over BroadcastChannel and refetch their own
  // digest. Each tab still makes that request, but it is one per real event
  // rather than one per tab per five seconds, and it 304s when nothing moved.
  useEffect(() => {
    if (!active || typeof window === 'undefined') return;
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      return; // Unsupported: this tab just relies on its own poll.
    }
    channel.onmessage = (event) => {
      const message = event.data as {
        type?: string;
        connected?: boolean;
        frame?: RealtimeFrame;
        payload?: OutboundPayload;
      };
      if (message?.type === 'sync') {
        refreshDigest();
        return;
      }
      // A frame the leader received and fanned out to the other tabs.
      if (message?.type === 'frame' && message.frame) {
        dispatchFrame(message.frame);
        return;
      }
      // A follower asking us to put something on the wire. Ignored unless we
      // actually hold the socket, so exactly one tab acts on it.
      if (message?.type === 'send' && message.payload && leaderSend) {
        leaderSend(message.payload);
        return;
      }
      // The leader owns the socket, so it is the only tab that knows whether one
      // is up. Followers mirror its state to decide their own poll interval —
      // otherwise they would keep polling every 5s while events were already
      // arriving, and the saving would only apply to whichever tab won the lease.
      if (message?.type === 'status' && typeof message.connected === 'boolean') {
        setSocketConnected(message.connected);
        setConnected(message.connected);
      }
    };
    return () => channel?.close();
  }, [active, refreshDigest]);

  // A follower that never hears from a leader must not sit on the slow interval
  // forever — if the leader tab is closed mid-session, this tab either becomes
  // the leader itself or falls back to polling.
  useEffect(() => {
    if (role === 'leader') return;
    const timer = window.setTimeout(() => setConnected(false), LEASE_STALE_MS * 2);
    return () => window.clearTimeout(timer);
  }, [role, connected]);

  useEffect(() => {
    if (!active || role !== 'leader' || typeof window === 'undefined') {
      setConnected(false);
      return;
    }
    const url = realtimeUrl();
    if (!url) {
      realtimeLog('no socket URL could be derived; set VITE_REALTIME_URL');
      return;
    }
    realtimeLog(`this tab is the leader; connecting to ${url}`);

    let socket: WebSocket | null = null;
    let retryTimer: number | undefined;
    let attempt = 0;
    let disposed = false;
    let broadcast: BroadcastChannel | null = null;
    try {
      broadcast = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      broadcast = null;
    }

    const connect = () => {
      if (disposed) return;
      const token = localStorage.getItem('accessToken');
      if (!token) {
        // Signed out, or mid token refresh. Retry rather than give up: this hook
        // is unmounted on real logout.
        retryTimer = window.setTimeout(connect, MIN_BACKOFF_MS);
        return;
      }

      try {
        socket = new WebSocket(`${url}?token=${encodeURIComponent(token)}`);
      } catch {
        scheduleRetry();
        return;
      }

      socket.onopen = () => {
        if (disposed) return;
        attempt = 0;
        realtimeLog('connected');
        setSocketConnected(true);
        // Only now can we actually put bytes on the wire; before this, callers
        // must fall through to their HTTP path.
        leaderSend = (payload: OutboundPayload) => {
          if (!socket || socket.readyState !== WebSocket.OPEN) return false;
          try {
            socket.send(JSON.stringify(payload));
            return true;
          } catch {
            return false;
          }
        };
        setConnected(true);
        broadcast?.postMessage({ type: 'status', connected: true });
        // Anything that happened while we were disconnected was missed, and the
        // socket has no replay. One refetch re-establishes the truth.
        refreshDigest();
      };

      socket.onmessage = (event) => {
        let frame: RealtimeFrame | null = null;
        try {
          frame = JSON.parse(String(event.data)) as RealtimeFrame;
        } catch {
          frame = null;
        }

        // Anything that is not a version bump is a feature frame (presence):
        // hand it to subscribers here and to the other tabs, and do not disturb
        // the digest — an ephemeral signal must not cost a refetch.
        if (frame && frame.scope && frame.scope !== 'user' && !frame.scope.startsWith('company:')) {
          dispatchFrame(frame);
          broadcast?.postMessage({ type: 'frame', frame });
          return;
        }

        // A version bump. Its contents are deliberately not read: it exists to
        // say "something changed", and the digest is what says what.
        refreshDigest();
        broadcast?.postMessage({ type: 'sync' });
      };

      socket.onclose = (event) => {
        leaderSend = null;
        setSocketConnected(false);
        // 4401 is our own "token rejected" code — distinguishes an auth problem
        // from an ordinary network drop, which otherwise look identical.
        realtimeLog(
          event.code === 4401
            ? 'closed: token rejected (4401) — the access token was invalid or expired'
            : `closed (code ${event.code}), reconnecting with backoff`
        );
        setConnected(false);
        broadcast?.postMessage({ type: 'status', connected: false });
        scheduleRetry();
      };

      socket.onerror = () => {
        // onclose always follows; retrying here too would double the backoff rate.
        socket?.close();
      };
    };

    const scheduleRetry = () => {
      if (disposed) return;
      // Exponential with jitter: without the jitter, every tab in the company
      // reconnects in lockstep after a server restart and stampedes it.
      const base = Math.min(MAX_BACKOFF_MS, MIN_BACKOFF_MS * 2 ** attempt);
      attempt += 1;
      retryTimer = window.setTimeout(connect, base * (0.5 + Math.random()));
    };

    connect();

    return () => {
      disposed = true;
      leaderSend = null;
      setSocketConnected(false);
      if (retryTimer) window.clearTimeout(retryTimer);
      broadcast?.close();
      if (socket) {
        socket.onclose = null; // Do not schedule a retry for our own teardown.
        socket.close();
      }
      setConnected(false);
    };
  }, [active, role, refreshDigest]);

  return {
    digestInterval: connected ? REALTIME_DIGEST_INTERVAL : FALLBACK_DIGEST_INTERVAL,
  };
}
