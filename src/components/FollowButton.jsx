import { useState } from 'react';
import { FollowsAPI } from '../api/client';

export default function FollowButton({ userId, initialFollowing, onChange }) {
  const [following, setFollowing] = useState(!!initialFollowing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setError('');
    const next = !following;
    setFollowing(next); // optimistic
    try {
      if (next) {
        await FollowsAPI.follow(userId);
      } else {
        await FollowsAPI.unfollow(userId);
      }
      onChange?.(next);
    } catch (err) {
      setFollowing(!next); // revert on failure
      // A tap that visibly does nothing is worse than a blunt error —
      // this is what actually would have surfaced the real cause the
      // first time this broke, instead of just quietly reverting.
      setError(err.message || "That follow didn't go through. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
      <button
        type="button"
        className={following ? 'btn btn-ghost' : 'btn btn-primary'}
        onClick={toggle}
        disabled={busy}
        style={{ padding: '8px 18px' }}
      >
        {following ? 'Following' : 'Follow'}
      </button>
      {error && (
        <span style={{ fontSize: 'var(--fs-xs)', color: '#b3261e' }}>{error}</span>
      )}
    </div>
  );
}
