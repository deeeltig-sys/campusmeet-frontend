import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { OtaKit } from '@otakit/capacitor-updater'
import './styles/global.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

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
if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
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
