// --- Terraform Mastery Tracker Service Worker ---
// Scope-aware base path + resilient precache

const CACHE_PREFIX = 'terraform-mastery-';
const CACHE_VERSION = 'v3';
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;

// Derive the repo base path from the SW registration scope
const BASE_PATH = new URL(self.registration.scope).pathname.replace(/\/?$/, '/');

// Adjust these to match files that actually exist in your repo
const PRECACHE_URLS = [
  BASE_PATH,                          // directory index
  BASE_PATH + 'index.html',
  BASE_PATH + 'manifest.json',
  BASE_PATH + 'icon-192x192.png',
  BASE_PATH + 'icon-512x512.png'
];

// --- INSTALL: cache core assets (resilient to individual failures) ---
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(
      PRECACHE_URLS.map(async (url) => {
        try {
          await cache.add(new Request(url, { cache: 'reload' }));
          // console.log('[SW] cached:', url);
        } catch (err) {
          console.warn('[SW] skip precache (failed):', url, err);
        }
      })
    );
    await self.skipWaiting();
  })());
});

// --- ACTIVATE: clean old caches & take control ---
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names.map((n) => {
        if (n.startsWith(CACHE_PREFIX) && n !== CACHE_NAME) {
          // console.log('[SW] deleting old cache:', n);
          return caches.delete(n);
        }
      })
    );
    await self.clients.claim();
  })());
});

// --- FETCH: app-shell for navigations; cache-first for static assets ---
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GETs inside our scope
  if (request.method !== 'GET' || !url.pathname.startsWith(BASE_PATH)) return;

  // Handle page navigations (SPA/app shell)
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const network = await fetch(request);
        // Optionally refresh the shell in cache
        const cache = await caches.open(CACHE_NAME);
        cache.put(BASE_PATH + 'index.html', network.clone());
        return network;
      } catch (err) {
        const cache = await caches.open(CACHE_NAME);
        const cachedShell = await cache.match(BASE_PATH + 'index.html');
        return cachedShell || new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })());
    return;
  }

  // Static assets within scope: cache-first, then network, then soft fail
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) {
      // Update in background (best-effort)
      event.waitUntil(
        fetch(request).then((resp) => {
          if (resp && resp.ok) cache.put(request, resp.clone());
        }).catch(() => {}) // ignore update errors
      );
      return cached;
    }

    try {
      const resp = await fetch(request);
      if (resp && resp.ok) cache.put(request, resp.clone());
      return resp;
    } catch (err) {
      // Last-ditch: if the exact asset was precached, serve it
      const fallback = await cache.match(request);
      return fallback || new Response('', { status: 504, statusText: 'Offline' });
    }
  })());
});

// --- Messages (e.g., to apply updates immediately) ---
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// --- Push Notifications (optional) ---
self.addEventListener('push', (event) => {
  const data = (() => {
    try { return event.data ? event.data.json() : {}; }
    catch { return {}; }
  })();

  const title = data.title || 'Terraform Mastery';
  const body = data.body || 'Time for your daily Terraform study!';
  const options = {
    body,
    icon: BASE_PATH + 'icon-192x192.png',
    badge: BASE_PATH + 'icon-192x192.png',
    vibrate: [200, 100, 200]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// --- Notification clicks: route back into app ---
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(BASE_PATH));
});
