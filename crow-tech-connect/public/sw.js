const CACHE_NAME = 'crowtech-v2';

// Pre-cache only the app shell (avoid caching dynamic routes like /dashboard)
const APP_SHELL_URL = '/';
const PRECACHE_URLS = ['/', '/auth', '/services'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((name) => (name !== CACHE_NAME ? caches.delete(name) : Promise.resolve()))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never cache cross-origin requests (e.g. Supabase auth/storage)
  if (url.origin !== self.location.origin) return;

  // SPA navigations: network-first, fallback to app shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(APP_SHELL_URL))
    );
    return;
  }

  // Static assets: cache-first
  const isStaticAsset = ['script', 'style', 'image', 'font'].includes(request.destination);
  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        });
      })
    );
  }
});


