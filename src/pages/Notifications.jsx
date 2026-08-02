import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationsAPI } from '../api/client';

const NOTIF_TEXT = {
  follow: (name) => `${name} started following you`,
  comment: (name) => `${name} commented on your post`,
  comment_reply: (name) => `${name} replied to your comment`,
  reaction: (name) => `${name} reacted to your post`,
  message: (name) => `${name} sent you a message`,
  friend_request: (name) => `${name} sent you a friend request`,
  friend_accept: (name) => `${name} accepted your friend request`,
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const loadNotifications = useCallback(async () => {
    try {
      const data = await NotificationsAPI.list();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load notifications.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    loadNotifications().finally(() => setLoading(false));
  }, [loadNotifications]);

  async function handleNotifTap(n) {
    if (!n.read) {
      NotificationsAPI.markRead(n.id).catch(() => {});
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    if ((n.type === 'follow' || n.type === 'friend_accept') && n.actor_id) {
      navigate(`/profile/${n.actor_id}`);
    } else if (n.type === 'friend_request') {
      // target_id here is the friend_request row's id, not a user or
      // post — there's nowhere to deep-link to except the Requests
      // tab itself, where the actual Accept/Decline buttons live.
      navigate('/friends', { state: { tab: 'requests' } });
    } else if (n.type === 'message' && n.target_id) {
      navigate(`/inbox/messages/${n.target_id}`);
    } else if ((n.type === 'comment' || n.type === 'comment_reply' || n.type === 'reaction') && n.target_id) {
      navigate(`/post/${n.target_id}`);
    }
  }

  return (
    <div className="screen">
      <header style={{ marginBottom: 'var(--sp-4)' }}>
        <p className="eyebrow">Notifications</p>
        <h1 className="h-display" style={{ fontSize: 'var(--fs-xl)' }}>What's new</h1>
      </header>

      {error && <div className="banner-error">{error}</div>}
      {loading && <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>}

      {!loading && (
        notifications.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)' }}>No notifications yet.</p>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => handleNotifTap(n)}
              className="card"
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 'var(--sp-2)',
                width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                background: n.read ? 'var(--ivory)' : 'var(--ivory-dim)',
              }}
            >
              <div className="avatar-circle" style={{ width: 36, height: 36, fontSize: '0.9rem' }}>
                {n.actor_avatar_url ? <img src={n.actor_avatar_url} alt="" /> : (n.actor_full_name ? n.actor_full_name.charAt(0) : '?')}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 'var(--fs-sm)' }}>
                  {(NOTIF_TEXT[n.type] || (() => 'New activity'))(n.actor_full_name || 'Someone')}
                </p>
                <time style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--ink-soft)' }}>
                  {new Date(n.created_at).toLocaleString()}
                </time>
              </div>
              {!n.read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--maroon)' }} />}
            </button>
          ))
        )
      )}
    </div>
  );
}
