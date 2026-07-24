import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import PostGrid from '../components/PostGrid';
import SocialLinksModal from '../components/SocialLinksModal';
import WallpaperModal, { WALLPAPER_PRESETS } from '../components/WallpaperModal';
import { ProfileAPI, AuthAPI } from '../api/client';
import VerifiedBadge from '../components/VerifiedBadge';
import GoldSparkle from '../components/GoldSparkle';
import campmeetLogo from '../assets/campmeet-logo.png';

const MAX_AVATAR_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const LEVEL_OPTIONS = ['Level 100', 'Level 200', 'Level 300', 'Level 400', 'Graduate', 'Alumni'];

export default function Profile() {
  const { user, logout, refresh } = useAuth();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const [showSocialModal, setShowSocialModal] = useState(false);
  const [showSettingsWallpaper, setShowSettingsWallpaper] = useState(false);

  const MAX_BIO_LENGTH = 280; // matches sanitize_bio() in backend/models/user.py
  const [bio, setBio] = useState('');
  const [savingBio, setSavingBio] = useState(false);
  const [bioSaved, setBioSaved] = useState(false);

  const [level, setLevel] = useState('');
  const [savingLevel, setSavingLevel] = useState(false);
  const [levelSaved, setLevelSaved] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setBio(user?.bio || '');
  }, [user?.bio]);

  useEffect(() => {
    setLevel(user?.level_of_study || '');
  }, [user?.level_of_study]);

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

  async function handleSaveLevel(nextLevel) {
    setLevel(nextLevel);
    setLevelSaved(false);
    setSavingLevel(true);
    setError('');
    try {
      await ProfileAPI.updateMe({ level_of_study: nextLevel });
      await refresh();
      setLevelSaved(true);
    } catch (err) {
      setError(err.message || 'Could not save your level.');
    } finally {
      setSavingLevel(false);
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
        <p className="eyebrow" style={{ marginBottom: 'var(--sp-3)' }}>Level of study</p>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)', marginBottom: 'var(--sp-3)' }}>
          Shows next to your school on your profile.
        </p>
        <select
          value={level}
          onChange={(e) => handleSaveLevel(e.target.value)}
          disabled={savingLevel}
          style={{
            width: '100%', padding: '10px 12px', border: '1px solid var(--line)',
            borderRadius: 10, fontFamily: 'inherit', fontSize: 'var(--fs-sm)', background: '#fff',
          }}
        >
          <option value="">Not set</option>
          {LEVEL_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
        {(savingLevel || levelSaved) && (
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', marginTop: 'var(--sp-2)' }}>
            {savingLevel ? 'Saving…' : 'Saved ✓'}
          </p>
        )}
      </div>

      <div className="card" style={{ marginBottom: 'var(--sp-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: 4 }}>Social links</p>
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)' }}>
            {Object.values(user?.social_links || {}).filter(Boolean).length > 0
              ? `${Object.values(user.social_links).filter(Boolean).length} platform${Object.values(user.social_links).filter(Boolean).length === 1 ? '' : 's'} added`
              : 'None added yet'}
          </p>
        </div>
        <button type="button" className="btn btn-primary" style={{ padding: '8px 18px' }} onClick={() => setShowSocialModal(true)}>
          Edit
        </button>
      </div>

      {showSocialModal && (
        <SocialLinksModal
          initialLinks={user?.social_links || {}}
          onClose={() => setShowSocialModal(false)}
          onSaved={() => { refresh(); setShowSocialModal(false); }}
        />
      )}

      <div style={{ marginBottom: 'var(--sp-4)' }}>
        <p className="eyebrow" style={{ marginBottom: 'var(--sp-3)' }}>Your posts</p>
        {user?.id && <PostGrid userId={user.id} />}
      </div>

      <div className="card" style={{ marginBottom: 'var(--sp-4)' }}>
        <p className="eyebrow" style={{ marginBottom: 'var(--sp-3)' }}>Settings</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, margin: 0 }}>Default chat wallpaper</p>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', margin: '2px 0 0' }}>
              Used for any chat that hasn't set its own
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 22, height: 22, borderRadius: '50%',
              background: (WALLPAPER_PRESETS[user?.default_wallpaper] || WALLPAPER_PRESETS.system).bg,
              border: '1px solid var(--line)',
              ...(user?.default_wallpaper === 'custom' && user?.default_wallpaper_url
                ? { backgroundImage: `url(${user.default_wallpaper_url})`, backgroundSize: 'cover' } : {}),
            }} />
            <button type="button" className="btn btn-ghost" style={{ padding: '6px 14px' }} onClick={() => setShowSettingsWallpaper(true)}>
              Change
            </button>
          </div>
        </div>
      </div>

      {showSettingsWallpaper && (
        <WallpaperModal
          mode="default"
          currentWallpaper={user?.default_wallpaper || 'system'}
          onClose={() => setShowSettingsWallpaper(false)}
          onSaved={() => refresh()}
        />
      )}

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
