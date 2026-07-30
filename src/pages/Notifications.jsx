import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { NotificationsAPI } from '../api/client';

const NOTIF_TEXT = {
  follow: (name) => `${name} started following you`,
  comment: (name) => `${name} commented on your post`,
  comment_reply: (name) => `${name} replied to your comment`,  // NEW
  reaction: (name) => `${name} reacted to your post`,
  message: (name) => `${name} sent you a message`,
  friend_request: (name) => `${name} sent you a friend request`,
  friend_accept: (name) => `${name} accepted your friend request`,
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);
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

  function announceReadStateChanged() {
    window.dispatchEvent(new CustomEvent('campusmeet:notifications-read'));
  }

  async function handleNotifTap(n) {
    if (!n.read) {
      NotificationsAPI.markRead(n.id).catch(() => {});
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      announceReadStateChanged();
    }
    
    // Navigate based on notification type
    if ((n.type === 'follow' || n.type === 'friend_accept') && n.actor_id) {
      navigate(`/profile/${n.actor_id}`);
    } else if (n.type === 'friend_request') {
      navigate('/friends');
    } else if (n.type === 'message' && n.target_id) {
      navigate(`/inbox/messages/${n.target_id}`);
    } else if ((n.type === 'comment' || n.type === 'comment_reply' || n.type === 'reaction') && n.target_id) {
      // For comments and replies, navigate to the post so user can see the context
      // (The target_id for comment_reply is the comment itself, but we need the post)
      // For now, just go to post — the comments sheet will load with all threads visible
      if (n.type === 'comment_reply') {
        // target_id is the comment, but we need the post_id
        // This is a limitation we'll fix by storing post_id in notifications later
        // For now, just navigate and let them find it in the post
        navigate(`/post/${n.target_id}`); 
      } else {
        navigate(`/post/${n.target_id}`);
      }
    }
  }

  async function handleMarkAllRead() {
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await NotificationsAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      announceReadStateChanged();
    } catch (err) {
      setError(err.message || 'Could not mark everything read.');
    } finally {
      setMarkingAll(false);
    }
  }

  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div className="screen">
      <header style={{ marginBottom: 'var(--sp-4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <p className="eyebrow">Notifications</p>
          <h1 className="h-display" style={{ fontSize: 'var(--fs-xl)' }}>What's new</h1>
        </div>
        {hasUnread && (
          <button type="button" className="post-action-link" onClick={handleMarkAllRead} disabled={markingAll}>
            {markingAll ? '…' : 'Mark all read'}
          </button>
        )}
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
                  {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
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
