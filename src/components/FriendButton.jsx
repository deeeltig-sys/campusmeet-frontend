import { useState } from 'react';
import { FriendsAPI } from '../api/client';

export default function FriendButton({ userId, initialStatus, initialRequestId, onChange }) {
  const [status, setStatus] = useState(initialStatus || 'none');
  const [requestId, setRequestId] = useState(initialRequestId || null);
  const [busy, setBusy] = useState(false);

  async function run(action) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      onChange?.();
    } catch {
      // leave status as-is on failure — better than guessing a revert
    } finally {
      setBusy(false);
    }
  }

  if (status === 'friends') {
    return (
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
    );
  }

  if (status === 'pending_sent') {
    return (
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
    );
  }

  if (status === 'pending_received') {
    return (
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
    );
  }

  return (
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
  );
}
