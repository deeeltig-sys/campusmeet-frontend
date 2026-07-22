import { useEffect, useState } from 'react';
import { PostsAPI } from '../api/client';
import VerifiedBadge from './VerifiedBadge';
import { REACTION_ICONS } from './icons';

export default function ReactorsModal({ postId, onClose }) {
  const [reactors, setReactors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    PostsAPI.reactors(postId)
      .then((data) => { if (!cancelled) setReactors(Array.isArray(data) ? data : []); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Could not load reactions.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [postId]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet-header">
          <strong style={{ fontFamily: 'var(--font-display)', color: 'var(--maroon-deep)' }}>
            Reactions
          </strong>
          <button type="button" className="modal-sheet-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-sheet-body">
          {loading ? (
            <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
          ) : error ? (
            <div className="banner-error">{error}</div>
          ) : reactors.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)' }}>No reactions yet.</p>
          ) : (
            reactors.map((r, i) => {
              const Icon = REACTION_ICONS[r.type];
              return (
                <div className="reactor-row" key={`${r.user_id || i}-${r.type}`}>
                  <div className="avatar-circle" style={{ width: 30, height: 30, fontSize: '0.8rem' }}>
                    {r.avatar_url ? <img src={r.avatar_url} alt="" /> : (r.full_name ? r.full_name.charAt(0) : '?')}
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 'var(--fs-sm)' }}>{r.full_name || 'Student'}</span>
                    <VerifiedBadge verified={r.verified} size={13} />
                  </div>
                  {Icon && <Icon size={17} color="var(--maroon)" />}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
