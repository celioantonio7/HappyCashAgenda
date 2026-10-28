/* Imported by the generated Workbox service worker. */
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let message;
  try { message = event.data.json(); } catch { return; }
  const base = new URL('./', self.registration.scope);
  let target = base.href;
  try {
    const candidate = new URL(message.url || '', base);
    if (candidate.origin === base.origin && candidate.pathname.startsWith(base.pathname)) target = candidate.href;
  } catch { /* Use app home for malformed destinations. */ }
  event.waitUntil(self.registration.showNotification(message.title || 'HappyCash Agenda', {
    body: message.body || '', tag: message.tag, icon: new URL('icons/icon-192.png', base).href,
    badge: new URL('icons/icon-192.png', base).href,
    data: { url: target },
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || self.registration.scope;
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windows) => {
    const existing = windows.find((client) => client.url.startsWith(self.registration.scope));
    if (existing) { await existing.navigate(target); return existing.focus(); }
    return clients.openWindow(target);
  }));
});
