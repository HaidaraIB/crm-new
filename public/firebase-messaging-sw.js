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

    const title = notification.title || data.title || 'LOOP CRM';
    const body = notification.body || data.body || '';

    /**
     * `tag` collapses repeats. A ringing call re-notified by a retried webhook
     * should replace its own banner rather than stack a second one; `renotify`
     * still alerts the user, so a genuinely new event is not silent.
     */
    const tag = data.type ? `crm-${data.type}-${data.call_id || data.client_id || ''}` : 'crm';

    const options = {
      body,
      tag,
      renotify: true,
      icon: '/logo.png',
      badge: '/browser_icon.png',
      // Carried through to the notificationclick handler below.
      data,
      // A ringing call needs the user to act; everything else can auto-dismiss.
      requireInteraction: data.type === 'whatsapp_call_incoming',
    };

    // Tell any open tab to refresh, so a user who *does* have the app open sees
    // the change immediately without waiting for their next poll. Mirrors the
    // `invalidate` convention the mobile app already uses.
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ source: 'crm-push', data });
      });
    });

    return self.registration.showNotification(title, options);
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
