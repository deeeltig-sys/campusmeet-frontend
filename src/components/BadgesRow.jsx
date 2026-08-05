import { useEffect, useState } from 'react';
import { BadgesAPI } from '../api/client';

/**
 * Row of earned badges on a profile — same horizontal-strip pattern
 * as HighlightsRow, so a profile with both reads as one consistent
 * "identity" section rather than two differently-styled widgets.
 * Renders nothing at all if the person hasn't earned anything yet,
 * same as HighlightsRow does for someone with no highlights — an
 * empty state here isn't a broken state, just a fresh account.
 */
export default function BadgesRow({ userId }) {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    BadgesAPI.forUser(userId)
      .then((data) => { if (!cancelled) setBadges(Array.isArray(data) ? data : []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId]);

  if (loading || badges.length === 0) return null;

  return (
    <div style={{ display: 'flex', gap: 'var(--sp-2)', overflowX: 'auto', marginBottom: 'var(--sp-3)', paddingBottom: 2 }}>
      {badges.map((b) => (
        <div
          key={b.id}
          title={`${b.name} — ${b.description}`}
          style={{
            flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 999, background: 'var(--maroon-light)',
            border: '1px solid var(--gold-bright)',
          }}
        >
          <span style={{ fontSize: '1rem', lineHeight: 1 }}>{b.icon || '🏅'}</span>
          <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--maroon-deep)', whiteSpace: 'nowrap' }}>
            {b.name}
          </span>
        </div>
      ))}
    </div>
  );
}
