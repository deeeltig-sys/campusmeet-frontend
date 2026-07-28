import { useState, useEffect } from 'react';

const DISMISSED_KEY = 'campmeet_install_dismissed_at';
const REPROMPT_AFTER_MS = 3 * 24 * 60 * 60 * 1000; // 3 days — "anytime" but not nagging every single visit

function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true // iOS Safari's own flag, no matchMedia equivalent
  );
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState(null); // 'android-desktop' | 'ios' | null

  useEffect(() => {
    if (isStandalone()) return; // already installed — never show anything

    const lastDismissed = Number(localStorage.getItem(DISMISSED_KEY) || 0);
    if (Date.now() - lastDismissed < REPROMPT_AFTER_MS) return;

    if (isIOS()) {
      // Apple never implemented beforeinstallprompt and never will —
      // there is no programmatic install trigger on iOS Safari. The
      // only real path is the manual Share -> Add to Home Screen flow,
      // so the best this can do is surface clear instructions instead
      // of pretending a one-tap install exists here.
      setPlatform('ios');
      setVisible(true);
      return;
    }

    // Android Chrome, and desktop Chrome/Edge, fire this when the PWA
    // criteria (manifest + icons + served over HTTPS) are met — it's
    // the actual native install trigger, captured here so it can be
    // shown on our own schedule instead of the browser's mini-infobar.
    function handleBeforeInstallPrompt(e) {
      e.preventDefault();
      setDeferredPrompt(e);
      setPlatform('android-desktop');
      setVisible(true);
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice; // resolves whether they accepted or dismissed the native dialog
    setDeferredPrompt(null);
    setVisible(false);
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed', left: 'var(--sp-3)', right: 'var(--sp-3)', bottom: 'calc(74px + env(safe-area-inset-bottom) + var(--sp-3))',
        maxWidth: 720, margin: '0 auto', zIndex: 60,
        background: 'var(--maroon-deep)', color: '#fff', borderRadius: 'var(--radius-md)',
        padding: 'var(--sp-3) var(--sp-4)', display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
      }}
    >
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 'var(--fs-sm)' }}>Install CampusMEET</p>
        <p style={{ margin: '2px 0 0', fontSize: 'var(--fs-xs)', color: 'rgba(255,255,255,0.8)' }}>
          {platform === 'ios'
            ? 'Tap the Share icon, then "Add to Home Screen"'
            : 'Add it to your home screen for quick access, like an app'}
        </p>
      </div>
      {platform === 'android-desktop' && (
        <button
          type="button"
          onClick={handleInstall}
          style={{ background: 'var(--gold-bright)', color: 'var(--maroon-deep)', border: 'none', borderRadius: 999, padding: '8px 16px', fontWeight: 700, fontSize: 'var(--fs-xs)', cursor: 'pointer', flexShrink: 0 }}
        >
          Install
        </button>
      )}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', cursor: 'pointer', flexShrink: 0, padding: 4 }}
      >
        ×
      </button>
    </div>
  );
}
