import { useState } from 'react';
import { FriendsAPI } from '../api/client';

export default function FriendButton({ userId, initialStatus, initialRequestId, onChange, compact = false }) {
  const [status, setStatus] = useState(initialStatus || 'none');
  const [requestId, setRequestId] = useState(initialRequestId || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // `compact` trims this from a full pill to a small tab that sits
  // flush against FollowButton/Message in a single row instead of
  // wrapping to a second line — same interactive states, just sized
  // to fit three across on a phone-width screen.
  const padding = compact ? '7px 4px' : '8px 18px';
  const fontSize = compact ? 'var(--fs-xs)' : undefined;
  const buttonStyle = { padding, ...(fontSize ? { fontSize } : {}), ...(compact ? { width: '100%', whiteSpace: 'nowrap' } : {}) };
  const wrapperStyle = { display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', ...(compact ? { flex: 1, minWidth: 0 } : {}) };

  async function run(action) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await action();
      onChange?.();
    } catch (err) {
      // A silently-ignored failure here is exactly what looks like
      // "tapping Add Friend does nothing" — surface it instead.
      setError(err.message || "That didn't go through. Give it another shot.");
    } finally {
      setBusy(false);
    }
  }

  const errorNote = error && (
    <span style={{ fontSize: 'var(--fs-xs)', color: '#b3261e', display: 'block', marginTop: 4 }}>{error}</span>
  );

  if (status === 'friends') {
    return (
      <div style={wrapperStyle}>
        <button
          type="button"
          className="btn btn-ghost"
          style={buttonStyle}
          disabled={busy}
          onClick={() => run(async () => {
            if (!window.confirm('Remove this friend?')) return;
            await FriendsAPI.unfriend(userId);
            setStatus('none');
          })}
        >
          Friends ✓
        </button>
        {errorNote}
      </div>
    );
  }

  if (status === 'pending_sent') {
    return (
      <div style={wrapperStyle}>
        <button
          type="button"
          className="btn btn-ghost"
          style={buttonStyle}
          disabled={busy}
          onClick={() => run(async () => {
            if (requestId) await FriendsAPI.cancel(requestId);
            setStatus('none');
          })}
        >
          {compact ? 'Requested' : 'Cancel request'}
        </button>
        {errorNote}
      </div>
    );
  }

  if (status === 'pending_received') {
    return (
      <div style={wrapperStyle}>
        <div style={{ display: 'flex', gap: 6, width: '100%' }}>
          <button
            type="button" className="btn btn-primary" style={compact ? { ...buttonStyle, flex: 1 } : { padding: '8px 14px' }} disabled={busy}
            onClick={() => run(async () => {
              if (requestId) await FriendsAPI.accept(requestId);
              setStatus('friends');
            })}
          >
            Accept
          </button>
          <button
            type="button" className="btn btn-ghost" style={compact ? { ...buttonStyle, flex: 1 } : { padding: '8px 14px' }} disabled={busy}
            onClick={() => run(async () => {
              if (requestId) await FriendsAPI.decline(requestId);
              setStatus('none');
            })}
          >
            Decline
          </button>
        </div>
        {errorNote}
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      <button
        type="button"
        className="btn btn-primary"
        style={buttonStyle}
        disabled={busy}
        onClick={() => run(async () => {
          await FriendsAPI.send(userId);
          setStatus('pending_sent');
        })}
      >
        Add Friend
      </button>
      {errorNote}
    </div>
  );
}
