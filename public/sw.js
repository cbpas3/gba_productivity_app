/// Service Worker for GBA Productivity Quest PWA
/// Caches the app shell and WASM assets for offline/installed use.

const CACHE_NAME = 'gba-quest-v1';

// Populated at build time or matched at runtime.
// We cache everything on first fetch (runtime caching strategy).
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
];

// Install: precache the known app shell URLs.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  // Activate immediately without waiting for old SW to retire.
  self.skipWaiting();
});

// Activate: clean up old caches.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  // Start controlling all open tabs immediately.
  self.clients.claim();
});

// Fetch: network-first for navigations, cache-first for assets.
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests.
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (ROM files loaded by user, etc.)
  if (!request.url.startsWith(self.location.origin)) return;

  // Navigation requests (HTML pages): network-first with cache fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Static assets (.js, .css, .wasm, .png, .svg): cache-first, fetch on miss.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Only cache successful same-origin responses.
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
    })
  );
});
