import { useState } from 'react';
import { FollowsAPI } from '../api/client';

export default function FollowButton({ userId, initialFollowing, onChange }) {
  const [following, setFollowing] = useState(!!initialFollowing);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const next = !following;
    setFollowing(next); // optimistic
    try {
      if (next) {
        await FollowsAPI.follow(userId);
      } else {
        await FollowsAPI.unfollow(userId);
      }
      onChange?.(next);
    } catch {
      setFollowing(!next); // revert on failure
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={following ? 'btn btn-ghost' : 'btn btn-primary'}
      onClick={toggle}
      disabled={busy}
      style={{ padding: '8px 18px' }}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  );
}
