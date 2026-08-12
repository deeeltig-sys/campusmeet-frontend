import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusesAPI, ConversationsAPI } from '../api/client';

/**
 * Matches WhatsApp Status's viewer list — who saw it and when, with a
 * direct way to message them right from that row instead of having to
 * back out, find them, and start a conversation separately. Reuses
 * ConversationsAPI.start, the same "find or create" endpoint the rest
 * of the app already uses for starting a DM.
 */
export default function StatusViewersModal({ statusId, onClose }) {
  const navigate = useNavigate();
  const [viewers, setViewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messagingId, setMessagingId] = useState(null);

  useEffect(() => {
    StatusesAPI.viewers(statusId)
      .then((data) => setViewers(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || "Viewers aren't loading right now."))
      .finally(() => setLoading(false));
  }, [statusId]);

  async function handleMessage(viewerId) {
    setMessagingId(viewerId);
    try {
      const conv = await ConversationsAPI.start(viewerId);
      onClose?.();
      navigate(`/inbox/messages/${conv.conversation_id}`);
    } catch (err) {
      setError(err.message || "Couldn't start that conversation. Try again.");
      setMessagingId(null);
    }
  }

  function timeAgo(iso) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet-header">
          <strong style={{ fontFamily: 'var(--font-display)', color: 'var(--maroon-deep)' }}>
            {viewers.length} {viewers.length === 1 ? 'view' : 'views'}
          </strong>
          <button type="button" className="modal-sheet-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-sheet-body">
          {error && <div className="banner-error">{error}</div>}

          {loading ? (
            <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
          ) : viewers.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)' }}>No one has viewed this yet.</p>
          ) : (
            viewers.map(({ viewer, viewed_at }) => (
              <div key={viewer.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-2) 0' }}>
                <div className="avatar-circle" style={{ width: 36, height: 36 }}>
                  {viewer.avatar_url ? <img src={viewer.avatar_url} alt="" /> : (viewer.full_name?.charAt(0) || '?')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ fontSize: 'var(--fs-sm)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {viewer.full_name || 'Student'}
                  </strong>
                  <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
                    {timeAgo(viewed_at)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleMessage(viewer.id)}
                  disabled={messagingId === viewer.id}
                  aria-label={`Message ${viewer.full_name || 'this viewer'}`}
                  style={{
                    background: 'none', border: '1px solid var(--line)', borderRadius: '50%',
                    width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 4h16v12H8l-4 4V4z" stroke="var(--maroon)" strokeWidth="2" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
