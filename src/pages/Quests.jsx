import { useEffect, useState } from 'react';
import { QuestsAPI } from '../api/client';
import BackHeader from '../components/BackHeader';

/**
 * The weekly/monthly checklist — same shape as an FB Page dashboard's
 * "things to do this week" prompts. Completing these earns points,
 * which feed the rolling window that relative-percentile badges
 * (db/reputation_system_migration.sql) are computed from — this
 * screen is the visible, actionable front door to that whole system,
 * not a separate feature bolted next to it.
 */
export default function Quests() {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    QuestsAPI.mine()
      .then((data) => setQuests(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || 'Could not load your quests.'))
      .finally(() => setLoading(false));
  }, []);

  const weekly = quests.filter((q) => q.cadence === 'weekly');
  const monthly = quests.filter((q) => q.cadence === 'monthly');

  function QuestCard({ q }) {
    const pct = Math.min(100, Math.round((q.progress_count / q.target_count) * 100));
    return (
      <div className="card" style={{ marginBottom: 'var(--sp-2)', opacity: q.completed ? 0.7 : 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--sp-2)' }}>
          <div>
            <strong style={{ fontSize: 'var(--fs-sm)' }}>
              {q.completed && '✓ '}{q.title}
            </strong>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', margin: '2px 0 0' }}>{q.description}</p>
          </div>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--maroon)',
            fontWeight: 700, whiteSpace: 'nowrap',
          }}>
            +{q.points_reward}
          </span>
        </div>
        <div style={{ marginTop: 8 }}>
          <div style={{ height: 6, borderRadius: 999, background: 'var(--ivory-dim)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${pct}%`, borderRadius: 999,
              background: q.completed ? 'var(--gold-bright)' : 'var(--maroon)',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', margin: '4px 0 0' }}>
            {q.progress_count} / {q.target_count}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <BackHeader fallback="/profile" eyebrow="Weekly & monthly" title="Quests" />

      {error && <div className="banner-error">{error}</div>}
      {loading ? (
        <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
      ) : quests.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-soft)' }}>No quests available right now — check back soon.</p>
        </div>
      ) : (
        <>
          {weekly.length > 0 && (
            <>
              <p className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>This week</p>
              {weekly.map((q) => <QuestCard key={q.id} q={q} />)}
            </>
          )}
          {monthly.length > 0 && (
            <>
              <p className="eyebrow" style={{ margin: 'var(--sp-3) 0 var(--sp-2)' }}>This month</p>
              {monthly.map((q) => <QuestCard key={q.id} q={q} />)}
            </>
          )}
        </>
      )}
    </div>
  );
}
