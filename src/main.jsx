import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { OtaKit } from '@otakit/capacitor-updater'
import './styles/global.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { getInitialTheme, applyTheme } from './utils/theme.js'

// Must run before the first paint, not inside a component — a
// useEffect-based theme toggle would render one light frame first on
// every load for anyone who picked dark, which is exactly the
// flash-of-wrong-theme this line exists to avoid.
applyTheme(getInitialTheme());

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)

// Registers the PWA service worker (public/sw.js) — required for
// Chrome/Edge/Android's install prompt to fire at all, and for the
// static shell to survive brief connectivity drops. Skipped entirely
// on native (Capacitor already provides an installed app shell there)
// and fails silently anywhere the browser doesn't support it.
//
// The two pieces below are the actual fix for "works on desktop,
// stuck on an old version on phone": a desktop browser tab gets
// closed and reopened often, which naturally triggers a fresh check
// for a new service worker. A phone's installed PWA is usually
// RESUMED from OS suspension instead — the same in-memory JS can keep
// running for days with nothing ever prompting a real reload.
// - `controllerchange` fires the instant a new service worker takes
//   over (already correctly set up via skipWaiting/clients.claim in
//   sw.js) — reloading right then means no one is silently stuck on
//   stale code once an update ships.
// - Re-checking on `visibilitychange`/`focus` covers the resume-from-
//   background case specifically: the browser doesn't check for a
//   new service worker on its own just because a suspended tab woke
//   back up, only on an actual navigation.
if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  let reloadingForUpdate = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadingForUpdate) return; // guards against a reload loop
    reloadingForUpdate = true;
    window.location.reload();
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      const recheck = () => registration.update().catch(() => {});
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') recheck();
      });
      window.addEventListener('focus', recheck);
    }).catch(() => {
      // A failed SW registration should never block the app from
      // loading — installability/offline are enhancements, not
      // dependencies of the core experience.
    });
  });
}

// Health handshake for OtaKit's OTA updates — confirms this bundle booted
// successfully. Without this call, a broken release never gets marked
// healthy and auto-rolls back to the last known-good bundle on the next
// launch. Only meaningful on native (Android); on web this plugin doesn't
// apply at all.
if (Capacitor.isNativePlatform()) {
  OtaKit.notifyAppReady().catch(() => {
    // Never let a missing/misconfigured OTA setup block the app itself
    // from working — this is a background health signal, not a
    // dependency the UI should wait on.
  });
}
