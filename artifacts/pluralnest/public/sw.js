// PluralNest Service Worker — offline-first PWA caching
// Bump this version string whenever you want to force a cache refresh.
const CACHE_VERSION = 'pluralnest-v1';
const PRECACHE = ['/'];

// ── Install: open the cache and pre-cache the shell ────────────────────────
self.addEventListener('install', (event) => {
  // Skip waiting so the new SW activates immediately on first install
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(PRECACHE).catch(() => {})
    )
  );
});

// ── Activate: delete stale caches from previous versions ───────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first for assets, network-first for navigation ────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Don't intercept cross-origin requests
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;
  const isAsset =
    path.includes('/_expo/') ||
    path.match(/\.(js|mjs|css|woff2?|ttf|otf|png|jpg|jpeg|gif|svg|ico|webp|json)$/i);

  if (isAsset) {
    // Cache-first: serve from cache instantly, populate cache on miss
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => cached || new Response('', { status: 408 }));
      })
    );
    return;
  }

  // Network-first for navigation: try network, fall back to cached index.html
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) =>
          cached ||
          caches.match('/').then((root) =>
            root || new Response('Offline — please open PluralNest while connected first.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' },
            })
          )
        )
      )
  );
});
