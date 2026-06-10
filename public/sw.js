// Zenzio Admin — Service Worker
// Shows OS desktop notifications even when the browser window is minimized,
// because navigator.serviceWorker.ready.showNotification() runs in this SW
// process (independent of page visibility) rather than in the page tab.

const APP_ORIGIN = self.location.origin;

// Take control of all clients immediately on activation so the very first
// page load can already reach this SW (no reload needed).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(clients.claim()));

// ── Notification messages from the main thread ────────────────────────────────
// The main thread calls:
//   navigator.serviceWorker.ready.then(reg =>
//     reg.showNotification(title, options)   ← preferred path
//   )
// This event handler is a fallback for browsers/scenarios where the main
// thread posts a SHOW_NOTIFICATION message instead.
self.addEventListener('message', (event) => {
  if (!event.data || event.data.type !== 'SHOW_NOTIFICATION') return;
  const { title, options } = event.data;
  event.waitUntil(
    self.registration.showNotification(title, options || {})
  );
});

// ── Notification click — bring the admin window into focus ────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const path = data.url || '/orders';
  const targetUrl = APP_ORIGIN + path;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Try to focus an existing admin window and navigate it
        for (const client of clientList) {
          try {
            if (new URL(client.url).origin === APP_ORIGIN) {
              return client.focus().then(() => {
                if ('navigate' in client) return client.navigate(targetUrl);
              });
            }
          } catch (_) {}
        }
        // No existing window found — open a new one
        return clients.openWindow(targetUrl);
      })
  );
});
