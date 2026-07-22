import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UsersAPI, FollowsAPI } from '../api/client';

/**
 * A horizontal-scroll "people to follow" card, meant to be dropped into
 * the feed list every few posts (see Feed.jsx). This is what actually
 * circulates lesser-known profiles to people who'd never scroll far
 * enough to find them organically — the follow growth loop the whole
 * connect-hub feature depends on.
 */
export default function SuggestedPeople() {
  const [people, setPeople] = useState([]);
  const [followingIds, setFollowingIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    UsersAPI.suggested(10)
      .then((data) => { if (!cancelled) setPeople(Array.isArray(data) ? data : []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  async function handleFollow(userId) {
    // Optimistic — same pattern as reactions: flip the button immediately,
    // only revert if the request actually fails.
    setFollowingIds((prev) => new Set(prev).add(userId));
    try {
      await FollowsAPI.follow(userId);
    } catch {
      setFollowingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  }

  if (loading || people.length === 0) return null; // nothing to suggest — don't show an empty shell

  return (
    <div className="card" style={{ marginBottom: 'var(--sp-4)', padding: 'var(--sp-3)' }}>
      <p className="eyebrow" style={{ marginBottom: 'var(--sp-3)', paddingLeft: 4 }}>People to follow</p>
      <div style={{ display: 'flex', gap: 'var(--sp-3)', overflowX: 'auto', paddingBottom: 4 }}>
        {people.map((person) => {
          const following = followingIds.has(person.id);
          return (
            <div
              key={person.id}
              style={{
                flex: '0 0 auto', width: 108, textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              }}
            >
              <button
                type="button"
                onClick={() => navigate(`/u/${person.id}`)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                {person.avatar_url ? (
                  <img
                    src={person.avatar_url}
                    alt=""
                    style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--gold)' }}
                  />
                ) : (
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%', border: '2px solid var(--gold)',
                    background: 'var(--maroon-light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-mono)', color: 'var(--maroon-deep)', fontWeight: 600,
                  }}>
                    {(person.full_name || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </button>
              <span
                onClick={() => navigate(`/u/${person.id}`)}
                style={{
                  fontSize: 'var(--fs-xs)', fontWeight: 600, cursor: 'pointer',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
                }}
              >
                {person.full_name}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--ink-soft)' }}>
                {person.follower_count || 0} followers
              </span>
              <button
                type="button"
                onClick={() => handleFollow(person.id)}
                disabled={following}
                style={{
                  fontSize: '0.7rem', fontWeight: 600, padding: '4px 12px', borderRadius: 999,
                  border: following ? '1px solid var(--line)' : 'none',
                  background: following ? 'transparent' : 'var(--maroon)',
                  color: following ? 'var(--ink-soft)' : '#fff',
                  cursor: following ? 'default' : 'pointer',
                }}
              >
                {following ? 'Following' : 'Follow'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
