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

// Bump BOTH version strings below on every deploy that changes CSS/JS —
// this is the only thing that makes a returning visitor's browser (or
// an already-installed PWA) actually fetch the new files instead of
// silently serving whatever got cached on their first visit, no matter
// how many times Netlify redeploys. This exact gap was the reason the
// dark-mode diamond name fix wasn't visible on the live site after
// shipping — the code was correct, the cache was just never told a
// new version existed. Any short unique string works (today's date,
// a counter, a commit hash) — it only has to change, the format never
// matters to the logic below.
const SHELL_CACHE = 'campusmeet-shell-v2-2026-08-09';
const STATIC_CACHE = 'campusmeet-static-v2-2026-08-09';
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

// --- Push notifications (rivalry system) ---
// Separate concern from the caching logic above: this fires whenever
// the backend sends a push via lib/push.py, whether or not the app is
// open. iOS Safari only delivers these if the PWA was added to the
// home screen first (see InstallPrompt.jsx) — no way around that,
// it's an Apple platform restriction, not something fixable here.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }
  const title = data.title || 'CampusMEET';
  const options = {
    body: data.body || '',
    icon: '/app-icon-512.png',
    badge: '/favicon.png',
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
