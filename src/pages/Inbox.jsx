import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConversationsAPI } from '../api/client';
import VerifiedBadge from '../components/VerifiedBadge';

export default function Inbox() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    loadConversations().finally(() => setLoading(false));
  }, [loadConversations]);

  const requests = conversations.filter((c) => c.is_request);
  const threads = conversations.filter((c) => !c.is_request);

  return (
    <div className="screen">
      <header style={{ marginBottom: 'var(--sp-4)' }}>
        <p className="eyebrow">Chats</p>
        <h1 className="h-display" style={{ fontSize: 'var(--fs-xl)' }}>
          Messages{requests.length > 0 ? ` (${requests.length} new)` : ''}
        </h1>
      </header>

      {error && <div className="banner-error">{error}</div>}
      {loading && <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>}

      {!loading && (
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

function timeAgo(iso) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
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
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <strong style={{ fontSize: 'var(--fs-sm)' }}>{other.full_name || 'Student'}</strong>
          <VerifiedBadge verified={other.verified} size={13} />
        </div>
        {conv.is_request ? (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--bronze)' }}>
            Message request
          </span>
        ) : conv.last_message_preview ? (
          <p style={{
            fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', margin: '2px 0 0',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {conv.last_message_preview}
          </p>
        ) : null}
      </div>
      {conv.last_message_at && (
        <time style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--ink-soft)', flexShrink: 0 }}>
          {timeAgo(conv.last_message_at)}
        </time>
      )}
    </Link>
  );
}
