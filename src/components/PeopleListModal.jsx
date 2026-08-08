import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import VerifiedBadge from './VerifiedBadge';

// Same look and tap-through behavior as FollowListModal, generalized
// with a `fetcher` prop instead of being locked to followers/following/
// friends — used for group members and event attendees, both of which
// resolve to a plain list of people but aren't keyed by a profile's
// userId the way FollowListModal's modes are.
export default function PeopleListModal({ title, fetcher, emptyText = 'No one here yet.', onClose, renderSubtext }) {
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetcher()
      .then((data) => { if (!cancelled) setPeople(Array.isArray(data) ? data : []); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Could not load this list.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fetcher]);

  function goToProfile(id) {
    if (!id) return;
    onClose?.();
    navigate(`/profile/${id}`);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet-header">
          <strong style={{ fontFamily: 'var(--font-display)', color: 'var(--maroon-deep)' }}>{title}</strong>
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
                {renderSubtext && (
                  <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)' }}>{renderSubtext(p)}</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
