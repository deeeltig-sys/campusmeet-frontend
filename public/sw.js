// CampusMEET service worker
//
// Two jobs:
//   1. Satisfies Chrome/Edge/Android's PWA installability requirement
//      (a registered service worker with a fetch handler) — without
//      this file, beforeinstallprompt in InstallPrompt.jsx never fires
//      no matter how good the manifest is.
//   2. Gives real offline resilience for the static app shell:
//      network-first for navigations (always try to get the freshest
//      HTML, fall back to cache if offline), stale-while-revalidate
//      for built JS/CSS/images (instant load, quietly refreshed).
//
// Deliberately does NOT touch /api/ requests or any cross-origin
// request (Supabase, the Render backend, Paystack, Google Fonts) —
// user data must always be live, never served from a cache.

const SHELL_CACHE = 'campusmeet-shell-v1';
const STATIC_CACHE = 'campusmeet-static-v1';
const CURRENT_CACHES = [SHELL_CACHE, STATIC_CACHE];

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !CURRENT_CACHES.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never intercept Supabase/backend/fonts/Paystack
  if (url.pathname.startsWith('/api/')) return; // never cache live app data

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  event.respondWith(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    )
  );
});
