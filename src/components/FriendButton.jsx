import { useState } from 'react';
import { FriendsAPI } from '../api/client';

export default function FriendButton({ userId, initialStatus, initialRequestId, onChange }) {
  const [status, setStatus] = useState(initialStatus || 'none');
  const [requestId, setRequestId] = useState(initialRequestId || null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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
      setError(err.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const errorNote = error && (
    <span style={{ fontSize: 'var(--fs-xs)', color: '#b3261e', display: 'block', marginTop: 4 }}>{error}</span>
  );

  if (status === 'friends') {
    return (
      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ padding: '8px 18px' }}
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
      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ padding: '8px 18px' }}
          disabled={busy}
          onClick={() => run(async () => {
            if (requestId) await FriendsAPI.cancel(requestId);
            setStatus('none');
          })}
        >
          Cancel request
        </button>
        {errorNote}
      </div>
    );
  }

  if (status === 'pending_received') {
    return (
      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button" className="btn btn-primary" style={{ padding: '8px 14px' }} disabled={busy}
            onClick={() => run(async () => {
              if (requestId) await FriendsAPI.accept(requestId);
              setStatus('friends');
            })}
          >
            Accept
          </button>
          <button
            type="button" className="btn btn-ghost" style={{ padding: '8px 14px' }} disabled={busy}
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
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <button
        type="button"
        className="btn btn-primary"
        style={{ padding: '8px 18px' }}
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
