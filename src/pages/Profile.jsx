import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ProfileAPI } from '../api/client';
import VerifiedBadge from '../components/VerifiedBadge';
import GoldSparkle from '../components/GoldSparkle';
import campmeetLogo from '../assets/campmeet-logo.png';

const MAX_AVATAR_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Matches PLATFORM_URL_TEMPLATES on the backend exactly — keys here are
// what gets sent in the social_links PATCH payload.
const DEFAULT_PLATFORMS = ['facebook', 'instagram', 'whatsapp', 'snapchat'];
const MORE_PLATFORMS = ['tiktok', 'x', 'linkedin', 'telegram', 'youtube', 'threads', 'discord'];
const PLATFORM_LABELS = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  snapchat: 'Snapchat',
  tiktok: 'TikTok',
  x: 'X (Twitter)',
  linkedin: 'LinkedIn',
  telegram: 'Telegram',
  youtube: 'YouTube',
  threads: 'Threads',
  discord: 'Discord',
};
const PLATFORM_PLACEHOLDERS = {
  facebook: 'username',
  instagram: 'username',
  whatsapp: '233241234567 (no + or spaces)',
  snapchat: 'username',
  tiktok: 'username',
  x: 'username',
  linkedin: 'username',
  telegram: 'username',
  youtube: 'channelhandle',
  threads: 'username',
  discord: 'username',
};

export default function Profile() {
  const { user, logout, refresh } = useAuth();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const [socialLinks, setSocialLinks] = useState({});
  const [showMorePlatforms, setShowMorePlatforms] = useState(false);
  const [savingLinks, setSavingLinks] = useState(false);
  const [linksSaved, setLinksSaved] = useState(false);

  // Keep local editing state in sync whenever a fresh user object arrives
  // (initial load, or after refresh() following a save elsewhere).
  useEffect(() => {
    if (user?.social_links) setSocialLinks(user.social_links);
  }, [user?.social_links]);

  function handleLinkChange(platform, value) {
    setLinksSaved(false);
    setSocialLinks((prev) => ({ ...prev, [platform]: value }));
  }

  async function handleSaveLinks() {
    setSavingLinks(true);
    setError('');
    try {
      // Strip empty values so we don't send blank strings for platforms
      // the person never filled in.
      const cleaned = Object.fromEntries(
        Object.entries(socialLinks).filter(([, v]) => v && v.trim())
      );
      await ProfileAPI.updateMe({ social_links: cleaned });
      await refresh();
      setLinksSaved(true);
    } catch (err) {
      setError(err.message || 'Could not save your social links.');
    } finally {
      setSavingLinks(false);
    }
  }

  // The session's user object is loaded once at app boot. If an admin
  // verifies this student while the app is already open, that change
  // wouldn't otherwise show up until the app is fully relaunched — so
  // pull a fresh copy every time this screen is visited.
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!user) return null;

  function handlePickAvatar() {
    fileInputRef.current?.click();
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // allow picking the same file again later

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPEG, PNG, or WEBP images are supported.');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError('Image must be under 4MB.');
      return;
    }

    setError('');
    setUploading(true);
    try {
      await ProfileAPI.uploadAvatar(file);
      await refresh(); // pulls the new avatar_url back into user
    } catch (err) {
      setError(err.message || 'Could not update your profile picture.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="screen">
      <header style={{ marginBottom: 'var(--sp-5)' }}>
        <p className="eyebrow">Your profile</p>
      </header>

      <div
        className="card"
        style={{
          background: user.verified ? 'var(--maroon-light)' : '#fff',
          borderColor: user.verified ? 'var(--gold)' : 'var(--line)',
          textAlign: 'center',
          marginBottom: 'var(--sp-4)',
          position: 'relative',
        }}
      >
        {user.verified && <GoldSparkle count={4} />}

        <div style={{ position: 'relative', width: 72, height: 72, margin: '0 auto var(--sp-3)' }}>
          <button
            type="button"
            onClick={handlePickAvatar}
            disabled={uploading}
            aria-label={user.avatar_url ? 'Change profile picture' : 'Add a profile picture'}
            style={{
              width: 72,
              height: 72,
              borderRadius: '999px',
              overflow: 'hidden',
              background: 'var(--maroon)',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-2xl)', color: 'var(--gold-bright)' }}>
                {user.full_name?.charAt(0) || '?'}
              </span>
            )}
            {uploading && (
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(26, 18, 16, 0.55)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '0.6875rem',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                …
              </span>
            )}
          </button>
          <span
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 24,
              height: 24,
              borderRadius: '999px',
              background: 'var(--gold-bright)',
              border: '2px solid #fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="6" width="18" height="14" rx="2" stroke="var(--maroon-deep)" strokeWidth="2" />
              <circle cx="12" cy="13" r="3.4" stroke="var(--maroon-deep)" strokeWidth="2" />
              <path d="M9 6l1-2h4l1 2" stroke="var(--maroon-deep)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleAvatarChange}
          style={{ display: 'none' }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <h2 className="h-display" style={{ fontSize: 'var(--fs-lg)', margin: 0 }}>{user.full_name}</h2>
          <VerifiedBadge verified={user.verified} />
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', marginTop: 4 }}>
          {user.student_id_number}
        </p>
        <p style={{ fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-2)', color: user.verified ? 'var(--maroon-deep)' : 'var(--ink-soft)' }}>
          {user.verified ? 'Verified USTED student' : 'Verification pending — an admin will confirm your student ID.'}
        </p>
      </div>

      {error && <div className="banner-error">{error}</div>}

      <div className="card" style={{ marginBottom: 'var(--sp-4)' }}>
        <p className="eyebrow" style={{ marginBottom: 'var(--sp-3)' }}>Social links</p>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)', marginBottom: 'var(--sp-3)' }}>
          Add your handles so other students can find you elsewhere.
        </p>

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
          onClick={handleSaveLinks}
          disabled={savingLinks}
        >
          {savingLinks ? 'Saving…' : linksSaved ? 'Saved ✓' : 'Save social links'}
        </button>
      </div>

      <button className="btn btn-ghost btn-block" onClick={logout}>
        Sign out
      </button>

      <footer style={{ textAlign: 'center', marginTop: 'var(--sp-7)' }}>
        <img src={campmeetLogo} alt="CampMEET" style={{ width: 56, opacity: 0.85, marginBottom: 'var(--sp-2)' }} />
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--ink-soft)', letterSpacing: '0.04em' }}>
          Created by Makaveli X<br />Founder &amp; Lead Developer, ProjectX Web Development
        </p>
      </footer>
    </div>
  );
}
