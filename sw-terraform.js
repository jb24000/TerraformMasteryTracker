const CACHE_NAME = 'terraform-mastery-v1';
const BASE_PATH = self.location.pathname.substring(0, self.location.pathname.lastIndexOf('/') + 1);

const urlsToCache = [
  BASE_PATH,
  BASE_PATH + 'index-terraform.html',
  BASE_PATH + 'manifest-terraform.json',
  BASE_PATH + 'offline-terraform.html',
  BASE_PATH + 'tf-icon-192x192.png',
  BASE_PATH + 'tf-icon-512x512.png',
  BASE_PATH + 'tf-icon-192x192-maskable.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', (event) => {
  // scope guard
  if (!event.request.url.startsWith(self.location.origin + BASE_PATH)) return;

  event.respondWith(
    caches.match(event.request).then((resp) => {
      if (resp) return resp;
      return fetch(event.request).catch(() => {
        // Offline fallback for navigations
        if (event.request.mode === 'navigate') {
          return caches.match(BASE_PATH + 'offline-terraform.html');
        }
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((names) =>
        Promise.all(names.map((n) => (n !== CACHE_NAME ? caches.delete(n) : undefined)))
      ),
      self.clients.claim()
    ])
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  const options = {
    body: data.body || 'Time for your Terraform learning!',
    icon: BASE_PATH + 'tf-icon-192x192.png',
    badge: BASE_PATH + 'tf-icon-192x192.png',
    vibrate: [100, 50, 100]
  };
  event.waitUntil(self.registration.showNotification(data.title || 'Terraform Mastery', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(BASE_PATH));
});
