const CACHE = 'r7-cache-v1';
const ASSETS = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin === location.origin) {
    e.respondWith((async () => {
      const cached = await caches.match(e.request);
      if (cached) return cached;
      try {
        const fresh = await fetch(e.request);
        const cache = await caches.open(CACHE);
        cache.put(e.request, fresh.clone());
        return fresh;
      } catch (err) {
        return cached || Response.error();
      }
    })());
  }
});
