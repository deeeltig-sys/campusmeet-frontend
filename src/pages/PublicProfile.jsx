import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { UsersAPI, ConversationsAPI, BlocksAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import VerifiedBadge from '../components/VerifiedBadge';
import FollowButton from '../components/FollowButton';
import ReportModal from '../components/ReportModal';
import BackHeader from '../components/BackHeader';
import PostGrid from '../components/PostGrid';
import {
  FaFacebook, FaInstagram, FaWhatsapp, FaSnapchat, FaTiktok, FaXTwitter,
  FaLinkedin, FaTelegram, FaYoutube, FaThreads, FaDiscord,
} from 'react-icons/fa6';
// Requires the `react-icons` package (npm install react-icons) —
// ships verified official brand marks instead of hand-drawn SVG paths.

const PLATFORM_LABELS = {
  facebook: 'Facebook', instagram: 'Instagram', whatsapp: 'WhatsApp', snapchat: 'Snapchat',
  tiktok: 'TikTok', x: 'X', linkedin: 'LinkedIn', telegram: 'Telegram',
  youtube: 'YouTube', threads: 'Threads', discord: 'Discord',
};
const PLATFORM_URL_TEMPLATES = {
  facebook: (h) => `https://facebook.com/${h}`,
  instagram: (h) => `https://instagram.com/${h}`,
  whatsapp: (h) => `https://wa.me/${h}`,
  snapchat: (h) => `https://snapchat.com/add/${h}`,
  tiktok: (h) => `https://tiktok.com/@${h}`,
  x: (h) => `https://x.com/${h}`,
  linkedin: (h) => `https://linkedin.com/in/${h}`,
  telegram: (h) => `https://t.me/${h}`,
  youtube: (h) => `https://youtube.com/@${h}`,
  threads: (h) => `https://threads.net/@${h}`,
  discord: (h) => `https://discord.com/users/${h}`,
};
// Official-ish brand colors for the button background — icon itself
// renders white on top so it stays legible on every platform's color.
const PLATFORM_ICONS = {
  facebook: FaFacebook, instagram: FaInstagram, whatsapp: FaWhatsapp, snapchat: FaSnapchat,
  tiktok: FaTiktok, x: FaXTwitter, linkedin: FaLinkedin, telegram: FaTelegram,
  youtube: FaYoutube, threads: FaThreads, discord: FaDiscord,
};
const PLATFORM_COLORS = {
  facebook: '#1877F2', instagram: '#DD2A7B', whatsapp: '#25D366', snapchat: '#FFFC00',
  tiktok: '#000000', x: '#000000', linkedin: '#0A66C2', telegram: '#26A5E4',
  youtube: '#FF0000', threads: '#000000', discord: '#5865F2',
};
// Snapchat's brand yellow is too light for a white glyph to read — every
// other platform's background is dark/saturated enough for white.
const PLATFORM_ICON_COLOR = { snapchat: '#000000' };

export default function PublicProfile() {
  const { userId } = useParams();
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError('');
    UsersAPI.profile(userId)
      .then(setProfile)
      .catch((err) => setError(err.message || 'Could not load this profile.'))
      .finally(() => setLoading(false));
  }, [userId]);

  async function handleMessage() {
    setMessaging(true);
    try {
      const res = await ConversationsAPI.start(userId);
      navigate(`/inbox/messages/${res.conversation_id}`);
    } catch (err) {
      setError(err.message || 'Could not start a conversation.');
    } finally {
      setMessaging(false);
    }
  }

  async function handleBlock() {
    if (!window.confirm(`Block ${profile.full_name || 'this student'}? They won't be able to message you, and you won't see their posts.`)) return;
    try {
      await BlocksAPI.block(userId);
      setBlocked(true);
    } catch (err) {
      setError(err.message || 'Could not block this user.');
    }
  }

  useEffect(() => {
    if (me?.id && userId === me.id) {
      navigate('/profile', { replace: true });
    }
  }, [userId, me?.id, navigate]);

  if (userId === me?.id) {
    return null;
  }

  return (
    <div className="screen">
      <BackHeader />

      {loading ? (
        <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
      ) : error ? (
        <div className="banner-error">{error}</div>
      ) : !profile ? null : (
        <>
          <div style={{ textAlign: 'center', marginBottom: 'var(--sp-4)' }}>
            <div className="avatar-circle" style={{ width: 72, height: 72, fontSize: '1.5rem', margin: '0 auto var(--sp-3)' }}>
              {profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : (profile.full_name ? profile.full_name.charAt(0) : '?')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <h1 className="h-display" style={{ fontSize: 'var(--fs-lg)' }}>{profile.full_name || 'Student'}</h1>
              <VerifiedBadge verified={profile.verified} size={18} />
            </div>
            {profile.university_name && (
              <p style={{ color: 'var(--ink-soft)', fontSize: 'var(--fs-sm)' }}>{profile.university_name}</p>
            )}
            {profile.bio && (
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink)', marginTop: 'var(--sp-2)', maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
                {profile.bio}
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--sp-4)', marginTop: 'var(--sp-2)' }}>
              <span style={{ fontSize: 'var(--fs-sm)' }}><strong>{profile.follower_count || 0}</strong> followers</span>
              <span style={{ fontSize: 'var(--fs-sm)' }}><strong>{profile.following_count || 0}</strong> following</span>
            </div>
          </div>

          {!blocked && (
            <div style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
              <FollowButton userId={userId} initialFollowing={profile.is_following} />
              <button type="button" className="btn btn-ghost" style={{ padding: '8px 18px' }} onClick={handleMessage} disabled={messaging}>
                {messaging ? 'Starting…' : 'Message'}
              </button>
            </div>
          )}

          {profile.social_links && Object.keys(profile.social_links).length > 0 && (
            <div className="card" style={{ marginBottom: 'var(--sp-4)' }}>
              <p className="eyebrow" style={{ marginBottom: 'var(--sp-3)', textAlign: 'center' }}>Find them elsewhere</p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(60px, 1fr))',
                gap: 'var(--sp-3)',
              }}>
                {Object.entries(profile.social_links).map(([platform, handle]) => {
                  const Icon = PLATFORM_ICONS[platform];
                  if (!Icon) return null; // unknown platform key — nothing to render a logo for
                  const url = PLATFORM_URL_TEMPLATES[platform]?.(handle);
                  if (!url) return null;
                  return (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      title={PLATFORM_LABELS[platform] || platform}
                      aria-label={`Open ${PLATFORM_LABELS[platform] || platform}`}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        textDecoration: 'none',
                      }}
                    >
                      <span
                        style={{
                          width: 48, height: 48, borderRadius: '50%',
                          background: PLATFORM_COLORS[platform] || 'var(--maroon)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'transform 0.12s ease',
                        }}
                      >
                        <Icon size={22} color={PLATFORM_ICON_COLOR[platform] || '#fff'} />
                      </span>
                      <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)' }}>
                        {PLATFORM_LABELS[platform] || platform}
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 'var(--sp-4)' }}>
            <p className="eyebrow" style={{ marginBottom: 'var(--sp-3)' }}>Posts</p>
            <PostGrid userId={userId} />
          </div>

          <div style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'center' }}>
            {!blocked && (
              <button type="button" className="post-action-link" onClick={handleBlock}>Block</button>
            )}
            <button type="button" className="post-action-link" onClick={() => setShowReport(true)}>Report</button>
          </div>

          {blocked && (
            <p style={{ textAlign: 'center', color: 'var(--ink-soft)', fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-3)' }}>
              You've blocked this user.
            </p>
          )}
        </>
      )}

      {showReport && (
        <ReportModal targetType="user" targetId={userId} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}
