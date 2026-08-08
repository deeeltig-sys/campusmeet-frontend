import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FollowsAPI, FriendsAPI } from '../api/client';
import VerifiedBadge from './VerifiedBadge';

// Shows followers, following, or friends for a given user. Followers/
// following were backed by existing endpoints from day one. 'friends'
// mode is the fix for the exact gap that got flagged: FriendsAPI.listOf
// (GET /api/friends/:user_id) already existed on the backend and worked
// for browsing anyone's friend list — it just had no button anywhere in
// the app pointing at it, on either your own profile or someone else's.
export default function FollowListModal({ userId, mode = 'followers', onClose }) {
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const fetcher = mode === 'following' ? FollowsAPI.following
      : mode === 'friends' ? FriendsAPI.listOf
      : FollowsAPI.followers;
    fetcher(userId)
      .then((data) => { if (!cancelled) setPeople(Array.isArray(data) ? data : []); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Could not load this list.'); })
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
              <button
                type="button"
                key={p.id}
                onClick={() => goToProfile(p.id)}
                className="reactor-row"
                style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}
              >
                <div className="avatar-circle" style={{ width: 30, height: 30, fontSize: '0.8rem' }}>
                  {p.avatar_url ? <img src={p.avatar_url} alt="" /> : (p.full_name ? p.full_name.charAt(0) : '?')}
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="name-shine" style={{ fontSize: 'var(--fs-sm)' }}>{p.full_name || 'Student'}</span>
                  <VerifiedBadge verified={p.verified} size={13} />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
