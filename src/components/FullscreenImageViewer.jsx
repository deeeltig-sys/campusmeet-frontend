import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

// Long-edge pixel targets. Named after common consumer terms rather
// than technical video resolutions, since these are photos not video —
// "1080p" etc is the mental model most people already have for
// "how big/sharp is this image", so it's used here as a size label,
// not a claim about video encoding.
const QUALITY_TIERS = [
  { key: '720p', label: '720p', longEdge: 1280 },
  { key: '1080p', label: '1080p', longEdge: 1920 },
  { key: 'hd', label: '2K HD', longEdge: 2560 },
  { key: '4k', label: '4K', longEdge: 3840 },
];

export default function FullscreenImageViewer({ imageUrl, caption, reactionBar, onClose }) {
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    // Locks the page behind the viewer from scrolling while it's open —
    // otherwise a background touch-scroll under a `fixed` overlay can
    // fight with the viewer's own gestures on some mobile browsers.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // Facebook/IG pattern: tapping the photo (or the black backdrop
  // around it) closes the viewer outright and drops you back on the
  // feed — it's not a "toggle the chrome" gesture. The one exception:
  // if the quality-tier menu is open, a background tap dismisses just
  // that menu first, same as tapping outside any other dropdown.
  function handleBackdropTap() {
    if (showQualityMenu) {
      setShowQualityMenu(false);
      return;
    }
    onClose();
  }

  const handleDownload = useCallback(async (tier) => {
    setDownloading(true);
    setShowQualityMenu(false);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      // Never upscale past the original — that wouldn't add real detail,
      // it'd just be a bigger file pretending to be higher quality. If
      // the source is smaller than the requested tier, download it at
      // its actual size instead.
      const naturalLongEdge = Math.max(img.width, img.height);
      const targetLongEdge = Math.min(tier.longEdge, naturalLongEdge);
      const scale = targetLongEdge / naturalLongEdge;

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      await new Promise((resolve) => {
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `campusmeet-${tier.key}.jpg`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          resolve();
        }, 'image/jpeg', 0.92);
      });
    } catch {
      // CORS on the image host can block canvas export — fall back to
      // just opening the original in a new tab so download still works.
      window.open(imageUrl, '_blank');
    } finally {
      setDownloading(false);
      // Matches Facebook's pattern: downloading closes the viewer and
      // drops you back on the feed, rather than leaving you staring at
      // the photo wondering if anything happened.
      onClose();
    }
  }, [imageUrl, onClose]);

  const viewer = (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={handleBackdropTap}
    >
      <img src={imageUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Back"
        style={{
          position: 'absolute', top: 'var(--sp-3)', left: 'var(--sp-3)', width: 38, height: 38, borderRadius: '50%',
          background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', fontSize: '1.3rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        ‹
      </button>

      <div style={{ position: 'absolute', top: 'var(--sp-3)', right: 'var(--sp-3)' }} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => setShowQualityMenu((v) => !v)}
          disabled={downloading}
          aria-label="Download"
          style={{
            width: 38, height: 38, borderRadius: '50%', background: 'rgba(0,0,0,0.5)', border: 'none',
            color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 3v12m0 0l-4-4m4 4l4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 19h14" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        {showQualityMenu && (
          <div className="card" style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, minWidth: 130, padding: 6 }}>
            {QUALITY_TIERS.map((tier) => (
              <button key={tier.key} type="button" className="post-menu-item" onClick={() => handleDownload(tier)}>
                {tier.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {(caption || reactionBar) && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, padding: 'var(--sp-4) var(--sp-3)',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
          }}
        >
          {caption && <p style={{ color: '#fff', fontSize: 'var(--fs-sm)', marginBottom: reactionBar ? 'var(--sp-3)' : 0 }}>{caption}</p>}
          {reactionBar}
        </div>
      )}

      {downloading && (
        <p style={{ position: 'absolute', bottom: 'var(--sp-3)', color: '#fff', fontSize: 'var(--fs-xs)' }}>Preparing download…</p>
      )}
    </div>
  );

  // Portalled straight to <body>, bypassing `.screen`'s own DOM
  // subtree entirely. `.screen` runs a page-enter animation with a
  // `transform` in its keyframes, and any element with an active
  // transform becomes the containing block for its `position: fixed`
  // descendants — so a viewer rendered *inside* `.screen` was
  // inheriting that as its "viewport" instead of the real one. That's
  // what caused the instability on both phone and desktop, and why it
  // was capped to `.screen`'s 600px desktop width instead of true
  // fullscreen. Rendering into `document.body` sidesteps the problem
  // completely, regardless of what any ancestor is doing.
  return createPortal(viewer, document.body);
}
