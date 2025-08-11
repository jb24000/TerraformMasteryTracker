const CACHE_NAME = 'terraform-mastery-v2';

// '/TerraformMasteryTracker/' — derived from the SW scope
const BASE_PATH = self.registration.scope.replace(self.location.origin, '');

const PRECACHE_URLS = [
  'index.html',
  'manifest.json',
  'icon-192x192.png',
  'icon-512x512.png'
].map(p => BASE_PATH + p);

// Install
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Fetch each URL explicitly to avoid redirects being added
    for (const url of PRECACHE_URLS) {
      const resp = await fetch(url, { cache: 'reload' });
      if (!resp.ok) throw new Error(`Precache failed ${url} (${resp.status})`);
      await cache.put(url, resp.clone());
    }
    await self.skipWaiting();
  })());
});

// Activate
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.map(n => n !== CACHE_NAME && caches.delete(n)));
    await self.clients.claim();
  })());
});

// Fetch
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (!url.pathname.startsWith(BASE_PATH)) return;

  event.respondWith((async () => {
    const cached = await caches.match(event.request, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const resp = await fetch(event.request);
      const cache = await caches.open(CACHE_NAME);
      cache.put(event.request, resp.clone());
      return resp;
    } catch (e) {
      // Offline nav fallback
      if (event.request.mode === 'navigate') {
        return caches.match(BASE_PATH + 'index.html');
      }
      throw e;
    }
  })());
});

// Messages
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// (Optional) Push handlers can stay as-is if you use them
