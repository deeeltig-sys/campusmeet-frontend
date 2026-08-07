import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PostsAPI } from '../api/client';
import VerifiedBadge from './VerifiedBadge';
import { REACTION_EMOJI } from './icons';

// Same four reactions/labels PostCard.jsx uses on the reaction bar
// itself — kept in sync deliberately so "Yawa" here means the same
// thing it means down on the post.
const REACTION_TABS = [
  { type: 'fire', label: 'Fire' },
  { type: 'cosign', label: 'Cosign' },
  { type: 'doubt', label: 'Doubt' },
  { type: 'yawa', label: 'Yawa' },
];

export default function ReactorsModal({ postId, onClose }) {
  const navigate = useNavigate();
  const [reactors, setReactors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

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

  // Only show tabs for reactions this post actually has, in the same
  // order as the reaction bar — no empty "Yawa (0)" tab cluttering a
  // post nobody yawa'd.
  const countsByType = useMemo(() => {
    const counts = {};
    for (const r of reactors) counts[r.type] = (counts[r.type] || 0) + 1;
    return counts;
  }, [reactors]);

  const visibleReactors = filter === 'all' ? reactors : reactors.filter((r) => r.type === filter);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet-header">
          <strong style={{ fontFamily: 'var(--font-display)', color: 'var(--maroon-deep)' }}>
            Reactions
          </strong>
          <button type="button" className="modal-sheet-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {reactors.length > 0 && (
          <div style={{ display: 'flex', gap: 4, padding: '0 var(--sp-3)', marginBottom: 'var(--sp-2)', overflowX: 'auto' }}>
            <button
              type="button"
              onClick={() => setFilter('all')}
              style={{
                padding: '5px 12px', borderRadius: 999, whiteSpace: 'nowrap', fontSize: 'var(--fs-xs)', fontWeight: 600,
                border: filter === 'all' ? 'none' : '1px solid var(--line)',
                background: filter === 'all' ? 'var(--maroon)' : 'transparent',
                color: filter === 'all' ? '#fff' : 'var(--ink-soft)', cursor: 'pointer',
              }}
            >
              All {reactors.length}
            </button>
            {REACTION_TABS.filter((r) => countsByType[r.type]).map((r) => {
              const active = filter === r.type;
              return (
                <button
                  type="button"
                  key={r.type}
                  onClick={() => setFilter(r.type)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 999,
                    whiteSpace: 'nowrap', fontSize: 'var(--fs-xs)', fontWeight: 600,
                    border: active ? 'none' : '1px solid var(--line)',
                    background: active ? 'var(--maroon)' : 'transparent',
                    color: active ? '#fff' : 'var(--ink-soft)', cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: '13px', lineHeight: 1 }}>{REACTION_EMOJI[r.type]}</span>
                  {r.label} {countsByType[r.type]}
                </button>
              );
            })}
          </div>
        )}

        <div className="modal-sheet-body">
          {loading ? (
            <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
          ) : error ? (
            <div className="banner-error">{error}</div>
          ) : reactors.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)' }}>No reactions yet.</p>
          ) : visibleReactors.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)' }}>No one yet.</p>
          ) : (
            visibleReactors.map((r, i) => {
              return (
                <button
                  type="button"
                  className="reactor-row"
                  key={`${r.user_id || i}-${r.type}`}
                  onClick={() => { if (r.user_id) { onClose?.(); navigate(`/profile/${r.user_id}`); } }}
                  style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', cursor: r.user_id ? 'pointer' : 'default' }}
                >
                  <div className="avatar-circle" style={{ width: 30, height: 30, fontSize: '0.8rem' }}>
                    {r.avatar_url ? <img src={r.avatar_url} alt="" /> : (r.full_name ? r.full_name.charAt(0) : '?')}
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 'var(--fs-sm)' }}>{r.full_name || 'Student'}</span>
                    <VerifiedBadge verified={r.verified} size={13} />
                  </div>
                  <span style={{ fontSize: '17px', lineHeight: 1 }}>{REACTION_EMOJI[r.type]}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
