import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FollowsAPI } from '../api/client';
import VerifiedBadge from './VerifiedBadge';

// Shows followers or following for a given user. Backed by the existing
// GET /api/users/:id/followers and /following endpoints — this modal was
// the missing piece; the API was already there.
export default function FollowListModal({ userId, mode = 'followers', onClose }) {
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const fetcher = mode === 'following' ? FollowsAPI.following : FollowsAPI.followers;
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet-header">
          <strong style={{ fontFamily: 'var(--font-display)', color: 'var(--maroon-deep)' }}>
            {mode === 'following' ? 'Following' : 'Followers'}
          </strong>
          <button type="button" className="modal-sheet-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-sheet-body">
          {loading ? (
            <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
          ) : error ? (
            <div className="banner-error">{error}</div>
          ) : people.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)' }}>
              {mode === 'following' ? 'Not following anyone yet.' : 'No followers yet.'}
            </p>
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
                  <span style={{ fontSize: 'var(--fs-sm)' }}>{p.full_name || 'Student'}</span>
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
