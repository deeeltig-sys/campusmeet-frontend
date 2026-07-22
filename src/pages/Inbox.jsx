import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { NotificationsAPI, ConversationsAPI } from '../api/client';
import VerifiedBadge from '../components/VerifiedBadge';

const NOTIF_TEXT = {
  follow: (name) => `${name} started following you`,
  comment: (name) => `${name} commented on your post`,
  reaction: (name) => `${name} reacted to your post`,
  message: (name) => `${name} sent you a message`,
};

export default function Inbox() {
  const [tab, setTab] = useState('notifications');
  const [notifications, setNotifications] = useState([]);
  const [conversations, setConversations] = useState([]);
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

  const loadConversations = useCallback(async () => {
    try {
      const data = await ConversationsAPI.list();
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load messages.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    Promise.all([loadNotifications(), loadConversations()]).finally(() => setLoading(false));
  }, [loadNotifications, loadConversations]);

  async function handleNotifTap(n) {
    if (!n.read) {
      NotificationsAPI.markRead(n.id).catch(() => {});
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    if (n.type === 'follow' && n.actor_id) {
      navigate(`/profile/${n.actor_id}`);
    } else if (n.type === 'message' && n.target_id) {
      navigate(`/inbox/messages/${n.target_id}`);
    }
    // comment/reaction notifications target a post — no single-post
    // view page exists yet, so those aren't tappable-through for now.
  }

  const requests = conversations.filter((c) => c.is_request);
  const threads = conversations.filter((c) => !c.is_request);

  return (
    <div className="screen">
      <header style={{ marginBottom: 'var(--sp-4)' }}>
        <p className="eyebrow">Inbox</p>
        <h1 className="h-display" style={{ fontSize: 'var(--fs-xl)', marginBottom: 'var(--sp-3)' }}>
          Notifications & messages
        </h1>
        <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
          <button
            type="button"
            className={tab === 'notifications' ? 'btn btn-primary' : 'btn btn-ghost'}
            style={{ padding: '8px 16px', flex: 1 }}
            onClick={() => setTab('notifications')}
          >
            Notifications
          </button>
          <button
            type="button"
            className={tab === 'messages' ? 'btn btn-primary' : 'btn btn-ghost'}
            style={{ padding: '8px 16px', flex: 1 }}
            onClick={() => setTab('messages')}
          >
            Messages{requests.length > 0 ? ` (${requests.length})` : ''}
          </button>
        </div>
      </header>

      {error && <div className="banner-error">{error}</div>}
      {loading && <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>}

      {!loading && tab === 'notifications' && (
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

      {!loading && tab === 'messages' && (
        <>
          {requests.length > 0 && (
            <>
              <p className="eyebrow" style={{ margin: 'var(--sp-3) 0 var(--sp-2)' }}>Message requests</p>
              {requests.map((c) => <ConversationRow key={c.id} conv={c} />)}
            </>
          )}
          {threads.length > 0 && (
            <>
              <p className="eyebrow" style={{ margin: 'var(--sp-3) 0 var(--sp-2)' }}>Conversations</p>
              {threads.map((c) => <ConversationRow key={c.id} conv={c} />)}
            </>
          )}
          {requests.length === 0 && threads.length === 0 && (
            <p style={{ color: 'var(--ink-soft)' }}>No conversations yet.</p>
          )}
        </>
      )}
    </div>
  );
}

function ConversationRow({ conv }) {
  const other = conv.other_user || {};
  return (
    <Link
      to={`/inbox/messages/${conv.id}`}
      className="card"
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 'var(--sp-2)', textDecoration: 'none', color: 'inherit' }}
    >
      <div className="avatar-circle">
        {other.avatar_url ? <img src={other.avatar_url} alt="" /> : (other.full_name ? other.full_name.charAt(0) : '?')}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <strong style={{ fontSize: 'var(--fs-sm)' }}>{other.full_name || 'Student'}</strong>
          <VerifiedBadge verified={other.verified} size={13} />
        </div>
        {conv.is_request && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--bronze)' }}>
            Message request
          </span>
        )}
      </div>
    </Link>
  );
}
