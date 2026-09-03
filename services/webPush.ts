/**
 * Web push registration.
 *
 * Complements the realtime socket rather than duplicating it. The socket makes
 * the app instant *while a tab is open*; this is the only thing that reaches a
 * user whose tab is closed or backgrounded — which is exactly when a ringing
 * WhatsApp call would otherwise go unanswered.
 *
 * It never carries data. A push says "something of this type happened"; the page
 * responds by invalidating the affected queries and refetching through the normal
 * authenticated endpoints, the same indirection the socket uses and for the same
 * reason (see hooks/useRealtimeChannel.ts).
 *
 * Entirely optional. With no Firebase config, no service worker support, or a
 * denied permission, every function here no-ops and the app behaves as it does
 * today. Nothing downstream may assume push is available.
 */

import { updateFcmTokenAPI } from './api';

type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

/** Push payload data, by the convention the backend already emits. */
export type PushData = {
  type?: string;
  /** Coarse "go refetch this" key: whatsapp:conversations, tenant_chat:messages, ... */
  invalidate?: string;
  client_id?: string;
  lead_id?: string;
  conversation_id?: string;
  call_id?: string;
  [key: string]: string | undefined;
};

function readConfig(): FirebaseWebConfig | null {
  const env = import.meta.env;
  const config: FirebaseWebConfig = {
    apiKey: String(env.VITE_FIREBASE_API_KEY ?? ''),
    authDomain: String(env.VITE_FIREBASE_AUTH_DOMAIN ?? ''),
    projectId: String(env.VITE_FIREBASE_PROJECT_ID ?? ''),
    storageBucket: String(env.VITE_FIREBASE_STORAGE_BUCKET ?? ''),
    messagingSenderId: String(env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? ''),
    appId: String(env.VITE_FIREBASE_APP_ID ?? ''),
  };
  // Sender id and project id are the two the SDK cannot work without. Treating a
  // partial config as absent keeps an unconfigured deploy silent rather than
  // throwing on every load.
  if (!config.messagingSenderId || !config.projectId) return null;
  return config;
}

function vapidKey(): string {
  return String(import.meta.env.VITE_FIREBASE_VAPID_KEY ?? '');
}

export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'Notification' in window &&
    'PushManager' in window
  );
}

/** True when push could work here: supported, configured, and already granted. */
export function isWebPushReady(): boolean {
  return (
    isWebPushSupported() &&
    readConfig() !== null &&
    Boolean(vapidKey()) &&
    Notification.permission === 'granted'
  );
}

let registrationPromise: Promise<string | null> | null = null;

/**
 * Register this browser for push and hand the token to the API.
 *
 * Resolves to the token, or null when push is unavailable for any reason. Safe to
 * call repeatedly — the work is done once per page load.
 *
 * Does **not** prompt for permission. Browsers reject (and Chrome permanently
 * penalises) permission requests that are not tied to a user gesture, and a CRM
 * that demands notification access on first paint is the kind of thing people
 * click "Block" on forever. Call requestWebPushPermission() from a button.
 */
export function registerWebPush(): Promise<string | null> {
  if (registrationPromise) return registrationPromise;
  registrationPromise = (async () => {
    try {
      if (!isWebPushSupported()) return null;
      const config = readConfig();
      if (!config || !vapidKey()) return null;
      if (Notification.permission !== 'granted') return null;

      // Dynamic import so the SDK is a separate chunk that unconfigured deploys
      // never download.
      const [{ initializeApp, getApps }, { getMessaging, getToken, isSupported }] =
        await Promise.all([import('firebase/app'), import('firebase/messaging')]);

      if (!(await isSupported())) return null;

      const app = getApps().length ? getApps()[0] : initializeApp(config);

      // The config rides on the query string because a file in public/ is copied
      // verbatim and cannot read build-time env vars. These are public project
      // identifiers, not credentials.
      const swUrl = `/firebase-messaging-sw.js?${new URLSearchParams(
        config as unknown as Record<string, string>
      ).toString()}`;
      const registration = await navigator.serviceWorker.register(swUrl);

      const token = await getToken(getMessaging(app), {
        vapidKey: vapidKey(),
        serviceWorkerRegistration: registration,
      });
      if (!token) return null;

      // platform: 'web' is what lets the server target browsers only, so a
      // desktop-only event does not also buzz this person's phone.
      await updateFcmTokenAPI(token, { platform: 'web' });
      return token;
    } catch {
      // Push is best-effort. A failure here must never surface to the user or
      // break the page — they still have the socket and the poll.
      return null;
    }
  })();
  return registrationPromise;
}

/** Prompt for notification permission. Must be called from a user gesture. */
export async function requestWebPushPermission(): Promise<boolean> {
  if (!isWebPushSupported() || !readConfig()) return false;
  try {
    const result = await Notification.requestPermission();
    if (result !== 'granted') return false;
    // Let a previously-refused registration try again now that we are allowed.
    registrationPromise = null;
    return (await registerWebPush()) !== null;
  } catch {
    return false;
  }
}

/**
 * Subscribe to pushes that arrive while a tab is open.
 *
 * Two sources, deliberately both: `onMessage` for a push delivered to this page
 * directly, and a service-worker message for one that arrived in the background
 * while this tab happened to be open. Handlers must be idempotent — an event can
 * legitimately arrive twice.
 */
export function subscribeToPushMessages(
  handler: (data: PushData) => void
): () => void {
  const disposers: Array<() => void> = [];

  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    const onSwMessage = (event: MessageEvent) => {
      const payload = event.data as { source?: string; data?: PushData } | undefined;
      if (payload?.source === 'crm-push' || payload?.source === 'crm-push-click') {
        handler(payload.data || {});
      }
    };
    navigator.serviceWorker.addEventListener('message', onSwMessage);
    disposers.push(() =>
      navigator.serviceWorker.removeEventListener('message', onSwMessage)
    );
  }

  void (async () => {
    try {
      if (!isWebPushReady()) return;
      const [{ getApps }, { getMessaging, onMessage, isSupported }] =
        await Promise.all([import('firebase/app'), import('firebase/messaging')]);
      if (!(await isSupported()) || !getApps().length) return;
      const unsubscribe = onMessage(getMessaging(getApps()[0]), (payload) => {
        handler((payload.data || {}) as PushData);
      });
      disposers.push(unsubscribe);
    } catch {
      // ignore — the service-worker path above still works
    }
  })();

  return () => disposers.forEach((dispose) => dispose());
}
