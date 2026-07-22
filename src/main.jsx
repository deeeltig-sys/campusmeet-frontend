import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { OtaKit } from '@otakit/capacitor-updater'
import './styles/global.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

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
