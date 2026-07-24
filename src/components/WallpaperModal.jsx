import { useRef, useState } from 'react';
import { ConversationsAPI, ProfileAPI } from '../api/client';

export const WALLPAPER_PRESETS = {
  black: { label: 'Black', bg: '#111111', dark: true },
  white: { label: 'White', bg: '#ffffff', dark: false },
  system: { label: 'System default', bg: 'var(--ivory)', dark: false },
  cream: { label: 'Cream', bg: '#faf6ee', dark: false },
  green: { label: 'Green', bg: '#3f6b4f', dark: true },
};

const MAX_DIMENSION = 900; // resized before storing — keeps the data URL a reasonable size

/**
 * mode="conversation" (default) — sets the wallpaper for one specific
 * chat, requires conversationId.
 * mode="default" — sets the Settings-level default applied to any
 * conversation that hasn't set its own override (see messages.py).
 */
export default function WallpaperModal({ conversationId, currentWallpaper, mode = 'conversation', onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  async function persist(wallpaper, customUrl) {
    if (mode === 'default') {
      await ProfileAPI.updateMe({ default_wallpaper: wallpaper, default_wallpaper_url: customUrl });
    } else {
      await ConversationsAPI.setWallpaper(conversationId, wallpaper, customUrl);
    }
  }

  async function applyPreset(key) {
    setSaving(true);
    setError('');
    try {
      await persist(key, null);
      onSaved?.({ wallpaper: key, custom_wallpaper_url: null });
      onClose();
    } catch (err) {
      setError(err.message || 'Could not set wallpaper.');
    } finally {
      setSaving(false);
    }
  }

  function handlePhotoPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    setError('');

    // Resized client-side via canvas before it ever leaves the device —
    // a full-resolution phone photo would make an unreasonably large
    // payload for what's just a background image.
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = async () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        try {
          await persist('custom', dataUrl);
          onSaved?.({ wallpaper: 'custom', custom_wallpaper_url: dataUrl });
          onClose();
        } catch (err) {
          setError(err.message || 'Could not set wallpaper.');
        } finally {
          setSaving(false);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet-header">
          <strong style={{ fontFamily: 'var(--font-display)', color: 'var(--maroon-deep)' }}>Chat wallpaper</strong>
          <button type="button" className="modal-sheet-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {error && <div className="banner-error">{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--sp-3)', marginBottom: 'var(--sp-3)' }}>
          {Object.entries(WALLPAPER_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              disabled={saving}
              style={{
                border: currentWallpaper === key ? '2px solid var(--gold-bright)' : '1px solid var(--line)',
                borderRadius: 10, padding: 0, cursor: 'pointer', overflow: 'hidden',
              }}
            >
              <div style={{ height: 48, background: preset.bg }} />
              <p style={{ fontSize: '0.6875rem', margin: '4px 0', color: 'var(--ink-soft)' }}>{preset.label}</p>
            </button>
          ))}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoPick}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          className="btn btn-ghost btn-block"
          onClick={() => fileInputRef.current?.click()}
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Choose a photo from your device'}
        </button>
      </div>
    </div>
  );
}
