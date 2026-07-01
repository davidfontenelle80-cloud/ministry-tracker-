/**
 * sw.js â KHub Boilerplate
 */

const CACHE_VERSION = 'ministry-tracker-v52-reminder-toggle-fix';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './css/dark-mode.css',
  './css/components.css',
  './css/responsive.css',
  './js/config.js',
  './js/sw-register.js',
  './js/i18n.js',
  './js/theme.js',
  './js/error-boundary.js',
  './js/a11y.js',
  './js/components/button.js',
  './js/components/modal.js',
  './js/components/card.js',
  './js/components/input.js',
  './js/perf.js',
  './js/push-config.js',
  './js/push.js',
  './js/app.js',
  './js/firebase/firebase-config.js',
  './js/firebase/cloud-backup.js',
];

function notificationTargetUrl(data = {}) {
  const base = new URL(data.url || '/ministry-tracker-/', self.location.origin);
  const sourceType = data.sourceType || 'ministry-note';
  const sourceId = data.sourceId || '';
  base.searchParams.set('screen', 'notes');
  base.searchParams.set('sourceType', sourceType);
  if (sourceId) base.searchParams.set('sourceId', sourceId);
  base.hash = 'notification';
  return base.href;
}

function notificationRouteMessage(data = {}) {
  return {
    type: 'NOTIFICATION_CLICK_ROUTE',
    screen: 'notes',
    sourceType: data.sourceType || 'ministry-note',
    sourceId: data.sourceId || '',
    url: notificationTargetUrl(data),
  };
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => clients.forEach(client => client.postMessage({ type: 'RELOAD_READY' })))
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isAppShell = PRECACHE_URLS.some(path => new URL(path, self.location.href).pathname === url.pathname);
  if (!isAppShell) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, response.clone()));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const data = (event.notification && event.notification.data) || {};
  const targetUrl = notificationTargetUrl(data);
  const routeMessage = notificationRouteMessage(data);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client && client.url.indexOf('/ministry-tracker-/') !== -1) {
          client.postMessage(routeMessage);
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    data = { title: 'Ministry Tracker', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Ministry Tracker';
  const options = {
    body: data.body || data.message || '',
    icon: data.icon || './icons/icon-192.png',
    badge: data.badge || './icons/icon-192.png',
    tag: data.tag || data.sourceId || 'ministry-tracker-reminder',
    data: {
      url: data.url || '/ministry-tracker-/',
      sourceType: data.sourceType || 'ministry-note',
      sourceId: data.sourceId || ''
    },
    requireInteraction: !!data.requireInteraction
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
