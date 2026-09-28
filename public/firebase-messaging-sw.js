/* eslint-disable no-undef */
/**
 * Background push handler for the CRM web app.
 *
 * Must live at the origin root under exactly this filename — the Firebase
 * messaging SDK looks for `/firebase-messaging-sw.js` and registers it itself if
 * we do not. It is in `public/` so Vite copies it verbatim; it is NOT bundled, so
 * it cannot import anything from the app and cannot read import.meta.env.
 *
 * The Firebase config therefore arrives as query parameters on the registration
 * URL (see services/webPush.ts). Those values are project identifiers, not
 * secrets — they ship in every Firebase web app's client bundle — so putting them
 * in a URL costs nothing.
 */

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

const params = new URLSearchParams(self.location.search);

const firebaseConfig = {
  apiKey: params.get('apiKey') || '',
  authDomain: params.get('authDomain') || '',
  projectId: params.get('projectId') || '',
  storageBucket: params.get('storageBucket') || '',
  messagingSenderId: params.get('messagingSenderId') || '',
  appId: params.get('appId') || '',
};

// Without a sender id there is nothing to subscribe to. Bail rather than throw:
// a service worker that fails to install is retried forever and fills the console
// on every page load.
if (firebaseConfig.messagingSenderId && firebaseConfig.projectId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    const notification = payload.notification || {};

    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ source: 'crm-push', data });
      });
    });

    // Web pushes from our API are data-only. If a legacy payload still carries
    // ``notification``, the browser already displayed it — do not show again.
    if (notification.title || notification.body) {
      return;
    }

    const title = data.title || 'LOOP CRM';
    const body = data.body || '';
    const dedupeKey =
      data.message_id ||
      data.call_id ||
      data.conversation_id ||
      data.client_id ||
      '';
    const tag = data.type ? `crm-${data.type}-${dedupeKey}` : `crm-${dedupeKey || 'general'}`;

    return self.registration.showNotification(title, {
      body,
      tag,
      renotify: Boolean(dedupeKey),
      icon: '/notification-icon.png',
      badge: '/notification-badge.png',
      data,
      requireInteraction: data.type === 'whatsapp_call_incoming',
    });
  });
}

/** Focus an existing tab rather than opening a duplicate. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.postMessage({ source: 'crm-push-click', data });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
        return undefined;
      })
  );
});
