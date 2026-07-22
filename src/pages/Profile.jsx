import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ProfileAPI, AuthAPI } from '../api/client';
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

  const MAX_BIO_LENGTH = 280; // matches sanitize_bio() in backend/models/user.py
  const [bio, setBio] = useState('');
  const [savingBio, setSavingBio] = useState(false);
  const [bioSaved, setBioSaved] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Keep local editing state in sync whenever a fresh user object arrives
  // (initial load, or after refresh() following a save elsewhere).
  useEffect(() => {
    if (user?.social_links) setSocialLinks(user.social_links);
  }, [user?.social_links]);

  useEffect(() => {
    setBio(user?.bio || '');
  }, [user?.bio]);

  function handleLinkChange(platform, value) {
    setLinksSaved(false);
    setSocialLinks((prev) => ({ ...prev, [platform]: value }));
  }

  function handleBioChange(value) {
    setBioSaved(false);
    setBio(value.slice(0, MAX_BIO_LENGTH));
  }

  async function handleSaveBio() {
    setSavingBio(true);
    setError('');
    try {
      await ProfileAPI.updateMe({ bio: bio.trim() });
      await refresh();
      setBioSaved(true);
    } catch (err) {
      setError(err.message || 'Could not save your bio.');
    } finally {
      setSavingBio(false);
    }
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

  async function handleDeleteAccount() {
    setDeleting(true);
    setError('');
    try {
      await AuthAPI.deleteAccount();
      logout();
    } catch (err) {
      setError(err.message || 'Could not delete your account. Please try again.');
      setDeleting(false);
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
          {user.university_name}
        </p>
        <p style={{ fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-2)', color: user.verified ? 'var(--maroon-deep)' : 'var(--ink-soft)' }}>
          {user.verified ? 'Verified student' : 'Verification pending — an admin will confirm your account.'}
        </p>
      </div>

      {error && <div className="banner-error">{error}</div>}

      <div className="card" style={{ marginBottom: 'var(--sp-4)' }}>
        <p className="eyebrow" style={{ marginBottom: 'var(--sp-3)' }}>Bio</p>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)', marginBottom: 'var(--sp-3)' }}>
          A line or two about you — shows up on your public profile.
        </p>
        <textarea
          value={bio}
          onChange={(e) => handleBioChange(e.target.value)}
          placeholder="Second-year IT student. Into gaming and music."
          rows={3}
          style={{
            width: '100%', resize: 'vertical', padding: '10px 12px',
            border: '1px solid var(--line)', borderRadius: 10, fontFamily: 'inherit',
            fontSize: 'var(--fs-sm)', boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--sp-2)' }}>
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)' }}>{bio.length}/{MAX_BIO_LENGTH}</span>
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '8px 18px' }}
            onClick={handleSaveBio}
            disabled={savingBio || bio === (user.bio || '')}
          >
            {savingBio ? 'Saving…' : bioSaved ? 'Saved' : 'Save bio'}
          </button>
        </div>
      </div>

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

      <div style={{ marginTop: 'var(--sp-6)' }}>
        {!showDeleteConfirm ? (
          <button
            type="button"
            className="post-action-link"
            style={{ display: 'block', margin: '0 auto', color: 'var(--maroon-deep)' }}
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete account
          </button>
        ) : (
          <div className="card" style={{ borderColor: 'var(--maroon)' }}>
            <p style={{ fontSize: 'var(--fs-sm)', marginBottom: 'var(--sp-2)' }}>
              This permanently deletes your account, posts, comments, and messages. This cannot be undone.
            </p>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)', marginBottom: 'var(--sp-2)' }}>
              Type <strong>DELETE</strong> to confirm.
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              style={{
                width: '100%', marginBottom: 'var(--sp-3)', padding: 'var(--sp-2) var(--sp-3)',
                border: '1px solid var(--line)', borderRadius: 'var(--radius-md)',
              }}
            />
            <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, background: 'var(--maroon)' }}
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deleting}
              >
                {deleting ? 'Deleting…' : 'Delete forever'}
              </button>
            </div>
          </div>
        )}
      </div>

      <footer style={{ textAlign: 'center', marginTop: 'var(--sp-7)' }}>
        <img src={campmeetLogo} alt="CampusMEET" style={{ width: 56, opacity: 0.85, marginBottom: 'var(--sp-2)' }} />
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--ink-soft)', letterSpacing: '0.04em' }}>
          Created by Makaveli X<br />Founder &amp; Lead Developer, ProjectX Web Development
        </p>
      </footer>
    </div>
  );
}
