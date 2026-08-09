import { useState, useEffect } from 'react';

const DISMISSED_KEY = 'campmeet_install_dismissed_at';
const REPROMPT_AFTER_MS = 3 * 24 * 60 * 60 * 1000; // Android/desktop — 3 days, not nagging

// iOS gets a much shorter reprompt window on purpose. Apple gives no
// programmatic install trigger and no way to hard-require it, so this
// is "soft power" instead of a technical mandate: not blocking, but
// persistent enough that skipping it never quietly becomes permanent.
// Every school-rank push you're not getting is a real, felt loss for
// exactly the audience this feature is built for — worth resurfacing
// often until they've actually installed.
const IOS_REPROMPT_AFTER_MS = 6 * 60 * 60 * 1000; // 6 hours

export function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true // iOS Safari's own flag, no matchMedia equivalent
  );
}

export function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

// The actual fix for "no native install prompt on iOS": a real
// step-by-step visual guide instead of one line of banner text people
// skim past. Exported so Profile.jsx can open the exact same guide
// from a permanent Settings row — someone who dismissed the banner
// (or missed it entirely, easy to do on a single toast) still has a
// deliberate place to find these steps later, rather than the banner
// being their only shot at ever seeing them.
export function IOSInstallGuide({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <div className="modal-sheet-header">
          <strong style={{ fontFamily: 'var(--font-display)', color: 'var(--maroon-deep)' }}>Add to Home Screen</strong>
          <button type="button" className="modal-sheet-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)', margin: '0 0 var(--sp-4)' }}>
          iPhone doesn't let apps trigger this automatically — Apple only allows it through Safari's own menu. Two taps, once you know where:
        </p>

        <div style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'flex-start', marginBottom: 'var(--sp-3)' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: 'var(--maroon)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0,
          }}>1</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--maroon-deep)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v12" />
              <path d="M8 7l4-4 4 4" />
              <rect x="5" y="10" width="14" height="11" rx="2" />
            </svg>
            <p style={{ margin: 0, fontSize: 'var(--fs-sm)' }}>
              Tap the <strong>Share</strong> icon in Safari's toolbar (this square-with-an-arrow, usually at the bottom of the screen)
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'flex-start', marginBottom: 'var(--sp-4)' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: 'var(--maroon)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0,
          }}>2</div>
          <p style={{ margin: 0, fontSize: 'var(--fs-sm)' }}>
            Scroll down the menu that opens and tap <strong>"Add to Home Screen"</strong> — CampusMEET's icon lands right on your home screen, opening full-screen like a real app from then on
          </p>
        </div>

        <button type="button" className="btn btn-primary btn-block" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState(null); // 'android-desktop' | 'ios' | null
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    if (isStandalone()) return; // already installed — never show anything

    const lastDismissed = Number(localStorage.getItem(DISMISSED_KEY) || 0);

    if (isIOS()) {
      // Apple never implemented beforeinstallprompt and never will —
      // there is no programmatic install trigger on iOS Safari, so
      // there's no way to hard-require this the way Android can.
      // The short reprompt window is the soft-power substitute: not a
      // block, just a decision to keep asking until it happens rather
      // than let a dismissal quietly become forever.
      if (Date.now() - lastDismissed < IOS_REPROMPT_AFTER_MS) return;
      setPlatform('ios');
      setVisible(true);
      return;
    }

    if (Date.now() - lastDismissed < REPROMPT_AFTER_MS) return;

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

  if (!visible) {
    // Even with the banner dismissed/not shown, someone could still
    // have the guide open (opened from Profile's permanent row via a
    // separate <IOSInstallGuide> render, or a lingering state edge
    // case) — but that's handled by Profile.jsx rendering its own
    // instance, so this component genuinely renders nothing once its
    // own banner is dismissed. Kept as an explicit early return rather
    // than folding into the JSX below so the no-op case stays obvious.
    return null;
  }

  return (
    <>
    <div
      style={{
        position: 'fixed', left: 'var(--sp-3)', right: 'var(--sp-3)', bottom: 'calc(74px + env(safe-area-inset-bottom) + var(--sp-3))',
        maxWidth: 720, margin: '0 auto', zIndex: 60,
        background: 'var(--maroon-deep)', color: '#fff', borderRadius: 'var(--radius-md)',
        padding: 'var(--sp-3) var(--sp-4)', display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
      }}
    >
      <div
        style={{ flex: 1, cursor: platform === 'ios' ? 'pointer' : 'default' }}
        onClick={() => { if (platform === 'ios') setShowIOSGuide(true); }}
        role={platform === 'ios' ? 'button' : undefined}
        tabIndex={platform === 'ios' ? 0 : undefined}
      >
        <p style={{ margin: 0, fontWeight: 600, fontSize: 'var(--fs-sm)' }}>
          {platform === 'ios' ? "Don't miss your school's rank" : 'Install CampusMEET'}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 'var(--fs-xs)', color: 'rgba(255,255,255,0.8)' }}>
          {platform === 'ios'
            ? 'Add to Home Screen for alerts the moment a rival school overtakes yours — tap here for the 2-step guide'
            : 'Add it to your home screen for quick access, like an app'}
        </p>
      </div>
      {platform === 'ios' && (
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          style={{ background: 'var(--gold-bright)', color: 'var(--maroon-deep)', border: 'none', borderRadius: 999, padding: '8px 16px', fontWeight: 700, fontSize: 'var(--fs-xs)', cursor: 'pointer', flexShrink: 0 }}
        >
          Show me
        </button>
      )}
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
        aria-label={platform === 'ios' ? 'Maybe later' : 'Dismiss'}
        style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)',
          fontSize: platform === 'ios' ? 'var(--fs-xs)' : '1.1rem',
          cursor: 'pointer', flexShrink: 0, padding: 4, whiteSpace: 'nowrap',
        }}
      >
        {platform === 'ios' ? 'Later' : '×'}
      </button>
    </div>
      {showIOSGuide && <IOSInstallGuide onClose={() => setShowIOSGuide(false)} />}
    </>
  );
}
