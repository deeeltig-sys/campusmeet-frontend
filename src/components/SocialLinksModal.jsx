import { useState, useEffect } from 'react';
import { ProfileAPI } from '../api/client';

const DEFAULT_PLATFORMS = ['facebook', 'instagram', 'whatsapp', 'snapchat'];
const MORE_PLATFORMS = ['tiktok', 'x', 'linkedin', 'telegram', 'youtube', 'threads', 'discord'];
const PLATFORM_LABELS = {
  facebook: 'Facebook', instagram: 'Instagram', whatsapp: 'WhatsApp', snapchat: 'Snapchat',
  tiktok: 'TikTok', x: 'X (Twitter)', linkedin: 'LinkedIn', telegram: 'Telegram',
  youtube: 'YouTube', threads: 'Threads', discord: 'Discord',
};
const PLATFORM_PLACEHOLDERS = {
  facebook: 'username', instagram: 'username', whatsapp: '233241234567 (no + or spaces)',
  snapchat: 'username', tiktok: 'username', x: 'username', linkedin: 'username',
  telegram: 'username', youtube: 'channelhandle', threads: 'username', discord: 'username',
};

export default function SocialLinksModal({ initialLinks, onClose, onSaved }) {
  const [socialLinks, setSocialLinks] = useState(initialLinks || {});
  const [showMorePlatforms, setShowMorePlatforms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setSocialLinks(initialLinks || {}); }, [initialLinks]);

  function handleLinkChange(platform, value) {
    setSaved(false);
    setSocialLinks((prev) => ({ ...prev, [platform]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await ProfileAPI.updateMe({ social_links: socialLinks });
      setSaved(true);
      onSaved?.(socialLinks);
    } catch (err) {
      setError(err.message || 'Could not save your social links.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" style={{ maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet-header">
          <strong style={{ fontFamily: 'var(--font-display)', color: 'var(--maroon-deep)' }}>Social links</strong>
          <button type="button" className="modal-sheet-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)', margin: '0 0 var(--sp-3)' }}>
          Add your handles so other students can find you elsewhere.
        </p>

        {error && <div className="banner-error">{error}</div>}

        {DEFAULT_PLATFORMS.map((platform) => (
          <div className="field" key={platform} style={{ marginBottom: 'var(--sp-2)' }}>
            <label htmlFor={`social-${platform}`}>{PLATFORM_LABELS[platform]}</label>
            <input
              id={`social-${platform}`}
              type="text"
              value={socialLinks[platform] || ''}
              onChange={(e) => handleLinkChange(platform, e.target.value)}
              placeholder={PLATFORM_PLACEHOLDERS[platform]}
            />
          </div>
        ))}

        {showMorePlatforms && MORE_PLATFORMS.map((platform) => (
          <div className="field" key={platform} style={{ marginBottom: 'var(--sp-2)' }}>
            <label htmlFor={`social-${platform}`}>{PLATFORM_LABELS[platform]}</label>
            <input
              id={`social-${platform}`}
              type="text"
              value={socialLinks[platform] || ''}
              onChange={(e) => handleLinkChange(platform, e.target.value)}
              placeholder={PLATFORM_PLACEHOLDERS[platform]}
            />
          </div>
        ))}

        {!showMorePlatforms && (
          <button
            type="button"
            className="btn btn-ghost btn-block"
            style={{ marginTop: 'var(--sp-2)' }}
            onClick={() => setShowMorePlatforms(true)}
          >
            Add more platforms
          </button>
        )}

        <button
          type="button"
          className="btn btn-primary btn-block"
          style={{ marginTop: 'var(--sp-3)' }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save social links'}
        </button>
      </div>
    </div>
  );
}
