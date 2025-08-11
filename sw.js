const CACHE_NAME = 'terraform-mastery-v1';
const ASSETS = [
  '/TerraformMasteryTracker/',
  '/TerraformMasteryTracker/index.html',
  '/TerraformMasteryTracker/manifest.json',
  '/TerraformMasteryTracker/icon-192x192.png',
  '/TerraformMasteryTracker/icon-512x512.png',
  '/TerraformMasteryTracker/style.css',
  '/TerraformMasteryTracker/app.js'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
