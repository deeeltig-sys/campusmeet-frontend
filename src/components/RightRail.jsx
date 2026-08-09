import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FriendsAPI } from '../api/client';
import VerifiedBadge from './VerifiedBadge';

/**
 * Desktop-only third column (see the `.desktop-right-rail` breakpoint
 * in styles/global.css — hidden entirely below 1100px, so tablet and
 * mobile are completely unaffected). Before this, `.protected-main`
 * capped out at a 600px centered column with nothing beside it, so a
 * wide monitor just showed a phone screen with huge empty margins on
 * both sides. This is the fix: the same "People you may know" data
 * that powers the Friends tab, given a permanent home next to the
 * feed the way Facebook's right rail is never empty either.
 */
export default function RightRail() {
  const [people, setPeople] = useState([]);
  const [addedIds, setAddedIds] = useState(() => new Set());
  const [errorIds, setErrorIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    FriendsAPI.suggestions(8)
      .then((data) => { if (!cancelled) setPeople(Array.isArray(data) ? data : []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleAdd(userId) {
    setAddedIds((prev) => new Set(prev).add(userId)); // optimistic, same pattern as SuggestedPeople's follow button
    setErrorIds((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
    try {
      await FriendsAPI.send(userId);
    } catch {
      setAddedIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      // Same "don't fail silently" fix applied everywhere else a
      // follow/friend action lives — a button that reverts with zero
      // explanation is what made the underlying RPC-grants bug so
      // hard to spot in the first place.
      setErrorIds((prev) => new Set(prev).add(userId));
    }
  }

  return (
    <aside className="desktop-right-rail">
      <div className="card" style={{ padding: 'var(--sp-3)', marginBottom: 'var(--sp-3)' }}>
        <p className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>Shortcuts</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button type="button" onClick={() => navigate('/groups')} className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '6px 8px' }}>
            Groups
          </button>
          <button type="button" onClick={() => navigate('/events')} className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '6px 8px' }}>
            Events
          </button>
          <button type="button" onClick={() => navigate('/insights')} className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '6px 8px' }}>
            Insights
          </button>
          <button type="button" onClick={() => navigate('/leaderboard')} className="btn btn-ghost" style={{ justifyContent: 'flex-start', padding: '6px 8px' }}>
            Leaderboard
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 'var(--sp-3)' }}>
        <p className="eyebrow" style={{ marginBottom: 'var(--sp-3)' }}>People you may know</p>

        {loading && <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>Loading…</p>}

        {!loading && people.length === 0 && (
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>
            No suggestions right now — check back soon.
          </p>
        )}

        {!loading && people.map((person) => {
          const added = addedIds.has(person.id);
          return (
            <div
              key={person.id}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}
            >
              <button
                type="button"
                onClick={() => navigate(`/profile/${person.id}`)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}
              >
                {person.avatar_url ? (
                  <img
                    src={person.avatar_url} alt=""
                    style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', background: 'var(--maroon-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-mono)', color: 'var(--maroon-deep)', fontWeight: 600,
                  }}>
                    {(person.full_name || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                <button
                  type="button"
                  onClick={() => navigate(`/profile/${person.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
                    padding: 0, cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  <span className="name-shine" style={{
                    fontSize: 'var(--fs-sm)', fontWeight: 600, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {person.full_name || 'Student'}
                  </span>
                  <VerifiedBadge verified={person.verified} size={12} />
                </button>
                {typeof person.mutual_friends === 'number' && (
                  <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', margin: '2px 0 0' }}>
                    {person.mutual_friends} mutual friend{person.mutual_friends === 1 ? '' : 's'}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => handleAdd(person.id)}
                  disabled={added}
                  style={{
                    fontSize: 'var(--fs-xs)', fontWeight: 600, padding: '5px 10px', borderRadius: 999,
                    border: added ? '1px solid var(--line)' : 'none',
                    background: added ? 'transparent' : 'var(--maroon)',
                    color: added ? 'var(--ink-soft)' : '#fff',
                    cursor: added ? 'default' : 'pointer',
                  }}
                >
                  {added ? 'Sent' : 'Add'}
                </button>
                {errorIds.has(person.id) && (
                  <span style={{ fontSize: '0.6rem', color: '#b3261e' }}>Failed — try again</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
