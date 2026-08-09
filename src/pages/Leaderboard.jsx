import { useEffect, useState } from 'react';
import { LeaderboardAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import BackHeader from '../components/BackHeader';

/**
 * Weekly, not all-time — resets every Monday (see leaderboard_this_week
 * in db/growth_loop_migration.sql). An all-time leaderboard would just
 * calcify around whoever joined earliest; this way someone who signed
 * up yesterday competes on equal footing with a 3-year veteran.
 */
export default function Leaderboard() {
  const { user } = useAuth();
  const [scope, setScope] = useState('university');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    LeaderboardAPI.weekly(scope)
      .then((data) => setEntries(data.entries || []))
      .catch((err) => setError(err.message || 'Could not load the leaderboard.'))
      .finally(() => setLoading(false));
  }, [scope]);

  return (
    <div className="screen">
      <BackHeader fallback="/profile" eyebrow="This week" title="Leaderboard" />

      <div style={{ display: 'flex', gap: 'var(--sp-2)', margin: '0 0 var(--sp-4)' }}>
        <button
          className={`btn ${scope === 'university' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
          onClick={() => setScope('university')}
        >
          My university
        </button>
        <button
          className={`btn ${scope === 'global' ? 'btn-primary' : 'btn-ghost'} btn-sm`}
          onClick={() => setScope('global')}
        >
          All campuses
        </button>
      </div>

      {loading && <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>}
      {!loading && error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
      {!loading && !error && entries.length === 0 && (
        <p style={{ color: 'var(--ink-soft)' }}>No activity yet this week — be the first.</p>
      )}

      {!loading && entries.map((e, i) => (
        <div
          key={e.user_id}
          className="card"
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
            marginBottom: 'var(--sp-2)', padding: 'var(--sp-3) var(--sp-4)',
            border: e.user_id === user?.id ? '1.5px solid var(--gold)' : undefined,
          }}
        >
          <span style={{ width: 24, textAlign: 'center', fontWeight: 700, color: 'var(--maroon-deep)' }}>
            {i + 1}
          </span>
          <div className="avatar-circle" style={{ width: 36, height: 36 }}>
            {e.avatar_url
              ? <img src={e.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (e.full_name || '?')[0]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 'var(--fs-sm)' }}>{e.full_name || 'Student'}</p>
            <p style={{ margin: 0, fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)' }}>{e.tier}</p>
          </div>
          <span style={{ fontWeight: 700, color: 'var(--gold)' }}>{e.points} pts</span>
        </div>
      ))}
    </div>
  );
}
