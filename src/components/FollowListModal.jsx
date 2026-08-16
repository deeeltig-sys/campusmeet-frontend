import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FollowsAPI, FriendsAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import VerifiedBadge from './VerifiedBadge';

// Shows followers, following, or friends for a given user. Followers/
// following were backed by existing endpoints from day one. 'friends'
// mode is the fix for the exact gap that got flagged: FriendsAPI.listOf
// (GET /api/friends/:user_id) already existed on the backend and worked
// for browsing anyone's friend list — it just had no button anywhere in
// the app pointing at it, on either your own profile or someone else's.
export default function FollowListModal({ userId, mode = 'followers', onClose }) {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unfollowingId, setUnfollowingId] = useState(null);

  // Unfollowing was possible from a person's own profile, but nowhere
  // in the one place people actually go looking for it — the list of
  // everyone you follow. Everyone shown here IS someone you follow
  // (that's what this list is), so no per-row lookup is needed: only
  // gate it to YOUR OWN following list, since someone else's list
  // isn't something you have any control over.
  const isOwnFollowingList = mode === 'following' && userId === authUser?.id;

  async function handleUnfollow(personId) {
    if (unfollowingId) return;
    setUnfollowingId(personId);
    const prev = people;
    setPeople((list) => list.filter((p) => p.id !== personId)); // optimistic
    try {
      await FollowsAPI.unfollow(personId);
    } catch (err) {
      setPeople(prev); // revert on failure
      setError(err.message || "That unfollow didn't go through. Try again.");
    } finally {
      setUnfollowingId(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const fetcher = mode === 'following' ? FollowsAPI.following
      : mode === 'friends' ? FriendsAPI.listOf
      : FollowsAPI.followers;
    fetcher(userId)
      .then((data) => { if (!cancelled) setPeople(Array.isArray(data) ? data : []); })
      .catch((err) => { if (!cancelled) setError(err.message || "This list won't load right now."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, mode]);

  function goToProfile(id) {
    if (!id) return;
    onClose?.();
    navigate(`/profile/${id}`);
  }

  const title = mode === 'following' ? 'Following' : mode === 'friends' ? 'Friends' : 'Followers';
  const emptyText = mode === 'following' ? 'Not following anyone yet.'
    : mode === 'friends' ? 'No friends yet.'
    : 'No followers yet.';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet-header">
          <strong style={{ fontFamily: 'var(--font-display)', color: 'var(--maroon-deep)' }}>
            {title}
          </strong>
          <button type="button" className="modal-sheet-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-sheet-body">
          {loading ? (
            <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
          ) : error ? (
            <div className="banner-error">{error}</div>
          ) : people.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)' }}>{emptyText}</p>
          ) : (
            people.map((p) => (
              <div key={p.id} className="reactor-row" style={{ width: '100%' }}>
                <button
                  type="button"
                  onClick={() => goToProfile(p.id)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', padding: 0, minWidth: 0 }}
                >
                  <div className="avatar-circle" style={{ width: 30, height: 30, fontSize: '0.8rem', flexShrink: 0 }}>
                    {p.avatar_url ? <img src={p.avatar_url} alt="" /> : (p.full_name ? p.full_name.charAt(0) : '?')}
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <span className="name-shine" style={{ fontSize: 'var(--fs-sm)' }}>{p.full_name || 'Student'}</span>
                    <VerifiedBadge verified={p.verified} size={13} />
                  </div>
                </button>
                {isOwnFollowingList && (
                  <button
                    type="button"
                    onClick={() => handleUnfollow(p.id)}
                    disabled={unfollowingId === p.id}
                    className="btn btn-ghost"
                    style={{ padding: '5px 12px', fontSize: 'var(--fs-xs)', flexShrink: 0 }}
                  >
                    {unfollowingId === p.id ? '…' : 'Unfollow'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
