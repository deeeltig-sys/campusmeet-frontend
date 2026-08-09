import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PostGrid from '../components/PostGrid';
import SocialLinksModal from '../components/SocialLinksModal';
import EditProfileModal from '../components/EditProfileModal';
import ProfileStrengthMeter, { computeProfileStrength, STRONG_PROFILE_THRESHOLD } from '../components/ProfileStrengthMeter';
import WallpaperModal, { WALLPAPER_PRESETS } from '../components/WallpaperModal';
import FollowListModal from '../components/FollowListModal';
import HighlightsRow from '../components/HighlightsRow';
import BadgesRow from '../components/BadgesRow';
import HighlightViewer from '../components/HighlightViewer';
import { ProfileAPI, AuthAPI, PostsAPI, FriendsAPI } from '../api/client';
import { getPushSubscriptionState, enablePush, disablePush, isPushSupported } from '../utils/push';
import { getInitialTheme, setTheme } from '../utils/theme';
import VerifiedBadge from '../components/VerifiedBadge';
import GoldSparkle from '../components/GoldSparkle';
import campmeetLogo from '../assets/campmeet-logo.png';

const MAX_AVATAR_BYTES = 4 * 1024 * 1024;

export default function Profile() {
  const { user, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [showSettingsWallpaper, setShowSettingsWallpaper] = useState(false);
  const [pushState, setPushState] = useState('unsupported'); // 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'
  const [pushBusy, setPushBusy] = useState(false);
  const [theme, setThemeState] = useState(getInitialTheme);
  const [showFollowers, setShowFollowers] = useState(false);
  const [openHighlightId, setOpenHighlightId] = useState(null);
  const [showFollowing, setShowFollowing] = useState(false);

  const [tab, setTab] = useState('posts'); // 'posts' | 'saved'
  const [postCount, setPostCount] = useState(0);
  const [friendCount, setFriendCount] = useState(0);

  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // The session's user object is loaded once at app boot. If an admin
  // verifies this student while the app is already open, that change
  // wouldn't otherwise show up until the app is fully relaunched — so
  // pull a fresh copy every time this screen is visited.
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    PostsAPI.byUser(user.id).then((data) => setPostCount(Array.isArray(data) ? data.length : 0)).catch(() => {});
    FriendsAPI.list().then((data) => setFriendCount(Array.isArray(data) ? data.length : 0)).catch(() => {});
  }, [user?.id]);

  useEffect(() => {
    if (!isPushSupported()) {
      setPushState('unsupported');
      return;
    }
    getPushSubscriptionState().then(setPushState).catch(() => setPushState('unsupported'));
  }, []);

  async function handlePushToggle() {
    setPushBusy(true);
    try {
      if (pushState === 'subscribed') {
        await disablePush();
        setPushState('unsubscribed');
      } else {
        await enablePush();
        setPushState('subscribed');
      }
    } catch (err) {
      setError(err.message || 'Could not update notification settings.');
      getPushSubscriptionState().then(setPushState).catch(() => {});
    } finally {
      setPushBusy(false);
    }
  }

  function handleThemeToggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next); // applies data-theme + persists to localStorage
    setThemeState(next);
  }

  if (!user) return null;

  function handlePickAvatar() {
    fileInputRef.current?.click();
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (!file.type.startsWith('image/')) {
      setError('Please pick an image file.');
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
      await refresh();
    } catch (err) {
      setError(err.message || 'Could not update your profile picture.');
    } finally {
      setUploading(false);
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

  const strength = computeProfileStrength(user, postCount);
  const showStrengthRing = strength >= STRONG_PROFILE_THRESHOLD;

  return (
    <div className="screen">
      {/* ---- Header — avatar, identity, stats, one Edit Profile action ---- */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--sp-4)', position: 'relative' }}>
        {user.verified && <GoldSparkle count={4} />}

        <div style={{ position: 'relative', width: 88, height: 88, margin: '0 auto var(--sp-3)' }}>
          <button
            type="button"
            onClick={handlePickAvatar}
            disabled={uploading}
            aria-label={user.avatar_url ? 'Change profile picture' : 'Add a profile picture'}
            className={showStrengthRing ? 'profile-strength-ring' : ''}
            style={{
              width: 88, height: 88, borderRadius: '999px', overflow: 'hidden',
              background: 'var(--maroon)', border: showStrengthRing ? undefined : '2px solid var(--line)',
              padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}
          >
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--fs-2xl)', color: 'var(--gold-bright)' }}>
                {user.full_name?.charAt(0) || '?'}
              </span>
            )}
            {uploading && (
              <span style={{
                position: 'absolute', inset: 0, background: 'rgba(26, 18, 16, 0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '0.6875rem', fontFamily: 'var(--font-mono)',
              }}>
                …
              </span>
            )}
          </button>
          <span style={{
            position: 'absolute', bottom: -2, right: -2, width: 26, height: 26, borderRadius: '999px',
            background: 'var(--gold-bright)', border: '2px solid var(--ivory)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="6" width="18" height="14" rx="2" stroke="var(--maroon-deep)" strokeWidth="2" />
              <circle cx="12" cy="13" r="3.4" stroke="var(--maroon-deep)" strokeWidth="2" />
              <path d="M9 6l1-2h4l1 2" stroke="var(--maroon-deep)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <h2 className="h-display" style={{ fontSize: 'var(--fs-lg)', margin: 0 }}>{user.full_name}</h2>
          <VerifiedBadge verified={user.verified} />
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', marginTop: 4 }}>
          {user.university_name}{user.level_of_study ? ` · ${user.level_of_study}` : ''}
        </p>
        {user.bio && (
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink)', margin: 'var(--sp-2) auto 0', maxWidth: 320 }}>
            {user.bio}
          </p>
        )}
        {!user.verified && (
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', marginTop: 6 }}>
            Verification pending — an admin will confirm your account.
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--sp-5)', margin: 'var(--sp-3) 0' }}>
          <button
            type="button"
            onClick={() => setTab('posts')}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 'var(--fs-sm)', color: 'inherit' }}
          >
            <strong>{postCount}</strong> posts
          </button>
          <button
            type="button"
            onClick={() => navigate('/friends')}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 'var(--fs-sm)', color: 'inherit' }}
          >
            <strong>{friendCount}</strong> friends
          </button>
          <button
            type="button"
            onClick={() => setShowFollowers(true)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 'var(--fs-sm)', color: 'inherit' }}
          >
            <strong>{user.follower_count || 0}</strong> followers
          </button>
          <button
            type="button"
            onClick={() => setShowFollowing(true)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 'var(--fs-sm)', color: 'inherit' }}
          >
            <strong>{user.following_count || 0}</strong> following
          </button>
        </div>

        <button type="button" className="btn btn-ghost" style={{ padding: '8px 24px' }} onClick={() => setShowEditModal(true)}>
          Edit profile
        </button>
      </div>

      {error && <div className="banner-error">{error}</div>}

      <HighlightsRow userId={user.id} onOpenHighlight={setOpenHighlightId} />
      <BadgesRow userId={user.id} />

      <ProfileStrengthMeter user={user} postCount={postCount} />

      {/* ---- Posts / Saved tabs — IG/X pattern ---- */}
      <div style={{ display: 'flex', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', marginBottom: 'var(--sp-3)' }}>
        {[
          { key: 'posts', label: 'Posts' },
          { key: 'saved', label: 'Saved' },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.8125rem', fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase',
              color: tab === t.key ? 'var(--maroon-deep)' : 'var(--ink-soft)',
              borderBottom: tab === t.key ? '2px solid var(--maroon-deep)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 'var(--sp-5)' }}>
        {tab === 'saved' && (
          <button
            type="button"
            onClick={() => navigate('/collections')}
            className="btn btn-ghost"
            style={{ marginBottom: 'var(--sp-3)', fontSize: 'var(--fs-sm)' }}
          >
            Organize into collections →
          </button>
        )}
        <PostGrid userId={user.id} mode={tab === 'saved' ? 'saved' : 'posts'} />
      </div>

      {showEditModal && (
        <EditProfileModal
          user={user}
          onClose={() => setShowEditModal(false)}
          onSaved={refresh}
          onOpenSocialLinks={() => setShowSocialModal(true)}
        />
      )}
      {showSocialModal && (
        <SocialLinksModal
          initialLinks={user?.social_links || {}}
          onClose={() => setShowSocialModal(false)}
          onSaved={() => { refresh(); setShowSocialModal(false); }}
        />
      )}
      {showFollowers && (
        <FollowListModal
          userId={user.id}
          mode="followers"
          onClose={() => setShowFollowers(false)}
        />
      )}
      {showFollowing && (
        <FollowListModal
          userId={user.id}
          mode="following"
          onClose={() => setShowFollowing(false)}
        />
      )}
      {openHighlightId && (
        <HighlightViewer
          highlightId={openHighlightId}
          onClose={() => setOpenHighlightId(null)}
        />
      )}

      <div
        className="card"
        style={{
          marginBottom: 'var(--sp-4)', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', cursor: 'pointer',
        }}
        onClick={() => navigate('/leaderboard')}
      >
        <div>
          <p className="eyebrow" style={{ marginBottom: 4 }}>This week</p>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 'var(--fs-lg)', color: 'var(--maroon-deep)' }}>
            {user?.weekly_points ?? 0} points
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)' }}>
            {user?.points_tier || 'Newcomer'}
            {user?.weekly_rank ? ` \u00B7 #${user.weekly_rank} this week` : ''}
          </p>
        </div>
        <span style={{ color: 'var(--gold)', fontWeight: 600, fontSize: 'var(--fs-sm)' }}>Leaderboard \u2192</span>
      </div>

      <div className="card" style={{ marginBottom: 'var(--sp-4)' }}>
        <p className="eyebrow" style={{ marginBottom: 'var(--sp-3)' }}>Explore</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
          <button type="button" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/groups')}>
            Groups
          </button>
          <button type="button" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/events')}>
            Events
          </button>
          <button type="button" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/insights')}>
            Insights
          </button>
          <button type="button" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }} onClick={() => navigate('/quests')}>
            Quests
          </button>
        </div>
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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--sp-3)', paddingTop: 'var(--sp-3)', borderTop: '1px solid var(--line)' }}>
          <div>
            <p style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, margin: 0 }}>Push notifications</p>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', margin: '2px 0 0' }}>
              {pushState === 'subscribed' ? 'On for this device' : pushState === 'denied' ? 'Blocked in browser settings' : 'Get notified even when the app is closed'}
            </p>
          </div>
          <button
            type="button"
            className={pushState === 'subscribed' ? 'btn' : 'btn btn-primary'}
            style={{ padding: '6px 14px', fontSize: 'var(--fs-sm)' }}
            onClick={handlePushToggle}
            disabled={pushBusy || pushState === 'denied' || pushState === 'unsupported'}
          >
            {pushBusy ? '…' : pushState === 'subscribed' ? 'Turn off' : 'Turn on'}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--sp-3)', paddingTop: 'var(--sp-3)', borderTop: '1px solid var(--line)' }}>
          <div>
            <p style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, margin: 0 }}>Dark mode</p>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', margin: '2px 0 0' }}>
              {theme === 'dark' ? 'On' : 'Off'}
            </p>
          </div>
          <button
            type="button"
            className={theme === 'dark' ? 'btn' : 'btn btn-primary'}
            style={{ padding: '6px 14px', fontSize: 'var(--fs-sm)' }}
            onClick={handleThemeToggle}
          >
            {theme === 'dark' ? 'Turn off' : 'Turn on'}
          </button>
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
                type="button" className="btn btn-ghost" style={{ flex: 1 }}
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button" className="btn btn-primary" style={{ flex: 1, background: 'var(--maroon)' }}
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
