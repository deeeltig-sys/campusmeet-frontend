import { useState, useEffect } from 'react';
import { HighlightsAPI } from '../api/client';

export default function HighlightsRow({ userId, onOpenHighlight }) {
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    HighlightsAPI.listForUser(userId)
      .then((data) => { if (!cancelled) setHighlights(Array.isArray(data) ? data : []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  if (loading || highlights.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: 'var(--sp-3)', overflowX: 'auto', padding: '4px 0 var(--sp-2)' }}>
      {highlights.map((h) => (
        <button
          key={h.id}
          type="button"
          onClick={() => onOpenHighlight(h.id)}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, width: 64 }}
        >
          <div style={{
            width: 58, height: 58, borderRadius: '50%', border: '1.5px solid var(--line)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            background: 'var(--maroon-light)',
          }}>
            {h.cover_url ? (
              <img src={h.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontFamily: 'var(--font-display)', color: 'var(--maroon-deep)', fontSize: '1.1rem' }}>
                {h.title.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <span style={{
            fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', whiteSpace: 'nowrap', overflow: 'hidden',
            textOverflow: 'ellipsis', width: '100%', textAlign: 'center',
          }}>
            {h.title}
          </span>
        </button>
      ))}
    </div>
  );
}
