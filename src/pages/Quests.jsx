import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QuestsAPI, SITE_URL } from '../api/client';
import { useAuth } from '../context/AuthContext';
import BackHeader from '../components/BackHeader';

/**
 * The weekly/monthly checklist — same shape as an FB Page dashboard's
 * "things to do this week" prompts. Completing these earns points,
 * which feed the rolling window that relative-percentile badges
 * (db/reputation_system_migration.sql) are computed from — this
 * screen is the visible, actionable front door to that whole system,
 * not a separate feature bolted next to it.
 *
 * Reactive by action_type: tapping an incomplete card doesn't just
 * describe the task, it opens it — same principle as an FB Page
 * admin panel where "Invite people to like your Page" drops you
 * straight into the invite flow instead of just telling you it
 * exists. Each quest already carries `action_type` from
 * routes/quests.py — this is the first thing on the frontend that
 * actually reads it instead of only displaying it as text.
 */

// Maps each backend action_type to what tapping the card should DO,
// not just say. referral_activated is the odd one out — everything
// else is "go to the screen where this happens," but a referral has
// no screen of its own, the action itself IS sharing a link, so that
// one fires the native share sheet directly instead of navigating.
const QUEST_ACTIONS = {
  post:                { label: 'Create a post',   to: '/create' },
  comment:              { label: 'Find something to comment on', to: '/' },
  reaction_given:       { label: 'Browse the feed', to: '/' },
  friend_added:         { label: 'Find people to add', to: '/friends' },
  status_posted:        { label: 'Post a Story',   to: '/' },
  referral_activated:   { label: 'Invite friends',  share: true },
};

export default function Quests() {
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [justCopiedId, setJustCopiedId] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    QuestsAPI.mine()
      .then((data) => setQuests(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || 'Could not load your quests.'))
      .finally(() => setLoading(false));
  }, []);

  const weekly = quests.filter((q) => q.cadence === 'weekly');
  const monthly = quests.filter((q) => q.cadence === 'monthly');

  // Same navigator.share-with-clipboard-fallback pattern as
  // PostCard's handleShare, deliberately kept identical rather than
  // reinvented, so invite links behave the same way everywhere in
  // the app. /onboarding is the public marketing landing (also what
  // PublicPostView links back to), the right target when there's no
  // specific post attached to the invite.
  async function handleInvite(questId) {
    const url = `${SITE_URL}/onboarding?ref=${user?.id ?? ''}`;
    const shareData = {
      title: 'CampusMEET',
      text: 'Join me on CampusMEET — your campus, all in one place.',
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // Backed out of the native share sheet — not an error worth surfacing.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setJustCopiedId(questId);
      setTimeout(() => setJustCopiedId((id) => (id === questId ? null : id)), 2000);
    } catch {
      // Clipboard write blocked (permissions/insecure context) — no
      // further fallback beyond this; the link itself was still shown
      // on screen via the button label change below.
    }
  }

  function handleQuestAction(q) {
    const action = QUEST_ACTIONS[q.action_type];
    if (!action) return;
    if (action.share) {
      handleInvite(q.id);
      return;
    }
    navigate(action.to);
  }

  function QuestCard({ q }) {
    const pct = Math.min(100, Math.round((q.progress_count / q.target_count) * 100));
    const action = QUEST_ACTIONS[q.action_type];
    const justCopied = justCopiedId === q.id;
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
        {!q.completed && action && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{ marginTop: 'var(--sp-2)', width: '100%' }}
            onClick={() => handleQuestAction(q)}
          >
            {justCopied ? 'Link copied' : action.label}
          </button>
        )}
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
