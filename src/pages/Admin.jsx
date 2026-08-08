import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AdminAPI, UsersAPI } from '../api/client';
import BackHeader from '../components/BackHeader';
import GoldSparkle from '../components/GoldSparkle';
import { REACTION_EMOJI } from '../components/icons';

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    if (user && !['admin', 'moderator'].includes(user.role)) {
      navigate('/feed');
    }
  }, [user, navigate]);

  const isAdmin = user?.role === 'admin';

  return (
    <div className="screen">
      <BackHeader eyebrow="Admin" title="Panel" fallback="/feed" />

      <div className="tab-row">
        <button
          type="button"
          className={`tab-btn${tab === 'overview' ? ' active' : ''}`}
          onClick={() => setTab('overview')}
        >
          Overview
        </button>
        <button
          type="button"
          className={`tab-btn${tab === 'verify' ? ' active' : ''}`}
          onClick={() => setTab('verify')}
        >
          Verify students
        </button>
        <button
          type="button"
          className={`tab-btn${tab === 'reports' ? ' active' : ''}`}
          onClick={() => setTab('reports')}
        >
          Reports
        </button>
        {isAdmin && (
          <button
            type="button"
            className={`tab-btn${tab === 'team' ? ' active' : ''}`}
            onClick={() => setTab('team')}
          >
            Team
          </button>
        )}
        <button
          type="button"
          className={`tab-btn${tab === 'velocity' ? ' active' : ''}`}
          onClick={() => setTab('velocity')}
        >
          Yawa activity
        </button>
      </div>

      {tab === 'overview' ? <OverviewPanel />
        : tab === 'verify' ? <VerifyPanel />
        : tab === 'reports' ? <ReportsPanel />
        : tab === 'team' ? <TeamPanel currentUserId={user?.id} isAdmin={isAdmin} />
        : <VelocityPanel />}
    </div>
  );
}

// Growth dashboard — every number a founder actually checks in on,
// one screen, backed by GET /api/admin/stats (routes/admin.py). Uses
// exact counts (rest_count) server-side, so this stays a fast single
// load even once the platform is thousands of users instead of 30.
function OverviewPanel() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setStats(await AdminAPI.stats());
    } catch (err) {
      setError(err.message || 'Could not load stats.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>;
  if (error) return <div className="banner-error">{error}</div>;
  if (!stats) return null;

  const cards = [
    { label: 'Total students', value: stats.total_users },
    { label: 'Verified', value: stats.verified_users },
    { label: 'Pending verification', value: stats.pending_users },
    { label: 'New this week', value: stats.new_users_7d },
    { label: 'Active posts', value: stats.total_posts },
    { label: 'Posts today', value: stats.posts_today },
    { label: 'Universities on platform', value: stats.total_universities },
    { label: 'Universities with real users', value: stats.active_universities },
    { label: 'Reports awaiting review', value: stats.pending_reports },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--sp-3)' }}>
      {cards.map((c) => (
        <div key={c.label} className="card" style={{ textAlign: 'center', padding: 'var(--sp-4) var(--sp-2)' }}>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--fs-xl)', color: 'var(--maroon-deep)', margin: 0,
          }}>
            {c.value === null || c.value === undefined ? '—' : c.value}
          </p>
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', margin: '4px 0 0' }}>{c.label}</p>
        </div>
      ))}
    </div>
  );
}

// Team access — search for a ProjectX teammate's existing CampusMEET
// account and grant/revoke moderator or admin. Backend enforces
// @require_admin on the actual role-change route (routes/admin.py),
// so even if this tab were somehow reached by a moderator, the calls
// would 403 — this UI gate (isAdmin) is just so a moderator never
// sees promote/demote controls in the first place, not the real
// security boundary.
function TeamPanel({ currentUserId, isAdmin }) {
  const [staff, setStaff] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [working, setWorking] = useState(null);
  const [error, setError] = useState('');

  const loadStaff = useCallback(async () => {
    try {
      const data = await AdminAPI.staffList();
      setStaff(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load the current team.');
    }
  }, []);

  useEffect(() => { loadStaff(); }, [loadStaff]);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setError('');
    try {
      const data = await UsersAPI.search(query.trim());
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Search failed.');
    } finally {
      setSearching(false);
    }
  }

  async function handleSetRole(userId, role) {
    setWorking(userId);
    setError('');
    try {
      await AdminAPI.setRole(userId, role);
      await loadStaff();
      setResults((prev) => prev.map((r) => (r.id === userId ? { ...r, role } : r)));
    } catch (err) {
      setError(err.message || 'Could not update that role.');
    } finally {
      setWorking(null);
    }
  }

  function RoleActions({ person }) {
    if (!isAdmin) return null;
    const isSelf = person.id === currentUserId;
    return (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {person.role !== 'moderator' && (
          <button
            type="button" className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 'var(--fs-xs)' }}
            disabled={working === person.id}
            onClick={() => handleSetRole(person.id, 'moderator')}
          >
            Make moderator
          </button>
        )}
        {person.role !== 'admin' && (
          <button
            type="button" className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 'var(--fs-xs)' }}
            disabled={working === person.id}
            onClick={() => handleSetRole(person.id, 'admin')}
          >
            Make admin
          </button>
        )}
        {person.role !== 'student' && (
          <button
            type="button" className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 'var(--fs-xs)' }}
            disabled={working === person.id || isSelf}
            title={isSelf ? "You can't remove your own access" : undefined}
            onClick={() => handleSetRole(person.id, 'student')}
          >
            Remove access
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {error && <div className="banner-error">{error}</div>}

      <p className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>Current team</p>
      {staff.length === 0 ? (
        <p style={{ color: 'var(--ink-soft)', fontSize: 'var(--fs-sm)', marginBottom: 'var(--sp-4)' }}>
          Just you, right now.
        </p>
      ) : (
        <div style={{ marginBottom: 'var(--sp-4)' }}>
          {staff.map((person) => (
            <div
              key={person.id} className="card"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}
            >
              <div>
                <strong style={{ fontSize: 'var(--fs-sm)' }}>{person.full_name || 'Unnamed'}</strong>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', margin: 0, textTransform: 'uppercase' }}>
                  {person.role}
                </p>
              </div>
              <RoleActions person={person} />
            </div>
          ))}
        </div>
      )}

      {isAdmin && (
        <>
          <p className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>Grant access</p>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 6, marginBottom: 'var(--sp-3)' }}>
            <input
              type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name…" style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary" disabled={searching}>
              {searching ? 'Searching…' : 'Search'}
            </button>
          </form>

          {results.map((person) => (
            <div
              key={person.id} className="card"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}
            >
              <div>
                <strong style={{ fontSize: 'var(--fs-sm)' }}>{person.full_name || 'Unnamed'}</strong>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', margin: 0, textTransform: 'uppercase' }}>
                  {person.role}
                </p>
              </div>
              <RoleActions person={person} />
            </div>
          ))}
        </>
      )}
    </>
  );
}

const REASON_LABELS = {
  sexual_harassment: 'Sexual harassment',
  tribal_harassment: 'Tribal harassment',
  bullying: 'Bullying',
  personal_harassment: 'Personal harassment',
  false_info_defamation: 'False info / defamation',
  impersonation: 'Impersonation',
  other: 'Other',
};

// Backend (routes/admin.py) and the API client (AdminAPI.reports /
// updateReport) have supported this since day one — this panel was
// the missing piece. Without it, staff had no screen to actually
// review or action a report; the queue just accumulated silently.
function ReportsPanel() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioning, setActioning] = useState(null);
  const [filter, setFilter] = useState('pending');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await AdminAPI.reports();
      setReports(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSetStatus(reportId, status) {
    setActioning(reportId);
    try {
      await AdminAPI.updateReport(reportId, status);
      setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status } : r)));
    } catch (err) {
      setError(err.message || 'Could not update this report. Try again.');
    } finally {
      setActioning(null);
    }
  }

  const visible = filter === 'all' ? reports : reports.filter((r) => r.status === filter);
  // Oldest first for the pending queue specifically — a triage queue
  // should surface whatever's been waiting longest, not whatever was
  // just reported. Other filters keep the backend's newest-first order.
  if (filter === 'pending') {
    visible.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }

  const OVERDUE_HOURS = 24;
  function hoursPending(createdAt) {
    return (Date.now() - new Date(createdAt).getTime()) / 3600000;
  }

  return (
    <>
      <div className="field" style={{ maxWidth: 220, marginBottom: 'var(--sp-3)' }}>
        <label htmlFor="report-filter">Show</label>
        <select id="report-filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="actioned">Actioned</option>
          <option value="all">All</option>
        </select>
      </div>

      {error && <div className="banner-error">{error}</div>}

      {loading ? (
        <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
      ) : visible.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-soft)' }}>Nothing here right now.</p>
        </div>
      ) : (
        visible.map((r) => (
          <div key={r.id} className="card" style={{ marginBottom: 'var(--sp-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--sp-2)' }}>
              <div>
                <strong style={{ fontSize: 'var(--fs-sm)' }}>{REASON_LABELS[r.reason] || r.reason}</strong>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', margin: '4px 0' }}>
                  {r.target_type} · {r.target_id}
                </p>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', textTransform: 'uppercase',
                  padding: '3px 8px', borderRadius: 999, whiteSpace: 'nowrap',
                  background: r.status === 'pending' ? 'var(--maroon-light)' : 'var(--ivory-dim)',
                  color: r.status === 'pending' ? 'var(--maroon-deep)' : 'var(--ink-soft)',
                }}
              >
                {r.status === 'pending' && hoursPending(r.created_at) >= OVERDUE_HOURS ? 'Overdue' : r.status}
              </span>
            </div>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', margin: '0 0 var(--sp-3)' }}>
              Reported {new Date(r.created_at).toLocaleString()}
            </p>
            {r.status !== 'actioned' && (
              <div style={{ display: 'flex', gap: 6 }}>
                {r.status === 'pending' && (
                  <button
                    type="button" className="btn btn-ghost" style={{ padding: '6px 12px', flex: 1 }}
                    disabled={actioning === r.id}
                    onClick={() => handleSetStatus(r.id, 'reviewed')}
                  >
                    Mark reviewed
                  </button>
                )}
                <button
                  type="button" className="btn btn-primary" style={{ padding: '6px 12px', flex: 1 }}
                  disabled={actioning === r.id}
                  onClick={() => handleSetStatus(r.id, 'actioned')}
                >
                  {actioning === r.id ? 'Working…' : 'Mark actioned'}
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </>
  );
}

function VerifyPanel() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actioning, setActioning] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      // ?verified=false is the pending queue — everyone signed up but not yet verified.
      const data = await AdminAPI.listUsers(false);
      setPending(Array.isArray(data) ? data : data?.users || []);
    } catch (err) {
      setError(err.message || 'Could not load pending verifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleVerify(userId) {
    setActioning(userId);
    try {
      await AdminAPI.verify(userId);
      setPending((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      setError(err.message || 'Verification failed. Try again.');
    } finally {
      setActioning(null);
    }
  }

  return (
    <>
      {error && <div className="banner-error">{error}</div>}

      {loading ? (
        <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
      ) : pending.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-soft)' }}>No pending verifications. All caught up.</p>
        </div>
      ) : (
        pending.map((u) => (
          <div key={u.id} className="card" style={{ marginBottom: 'var(--sp-3)', position: 'relative' }}>
            <strong>{u.full_name}</strong>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)', margin: '4px 0 var(--sp-3)' }}>
              {u.student_id_number}
            </p>
            <button
              className="btn btn-gold btn-block"
              style={{ padding: '10px', position: 'relative' }}
              disabled={actioning === u.id}
              onClick={() => handleVerify(u.id)}
            >
              {actioning === u.id ? 'Verifying…' : 'Verify student'}
              {actioning !== u.id && <GoldSparkle count={3} />}
            </button>
          </div>
        ))
      )}
    </>
  );
}

// Read-only monitoring of how fast posts are picking up yawa reactions.
// This does not hide, flag, or down-rank anything in the feed — every post
// keeps the same weight regardless of reaction volume or type. It just
// gives staff visibility so a human can check in on fast-moving posts.
function VelocityPanel() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [windowHours, setWindowHours] = useState(6);

  const load = useCallback(async (hours) => {
    setLoading(true);
    setError('');
    try {
      const data = await AdminAPI.yawaVelocity(hours);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load reaction activity.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(windowHours); }, [load, windowHours]);

  return (
    <>
      <p style={{ color: 'var(--ink-soft)', fontSize: 'var(--fs-sm)', marginBottom: 'var(--sp-4)' }}>
        Posts getting yawa reactions fastest right now. Ranking and visibility in the feed are unaffected — this is here so you can look at what's moving, not to act on it automatically.
      </p>

      <div className="field" style={{ maxWidth: 220 }}>
        <label htmlFor="window-select">Window</label>
        <select
          id="window-select"
          value={windowHours}
          onChange={(e) => setWindowHours(Number(e.target.value))}
        >
          <option value={1}>Last hour</option>
          <option value={6}>Last 6 hours</option>
          <option value={24}>Last 24 hours</option>
        </select>
      </div>

      {error && <div className="banner-error">{error}</div>}

      {loading ? (
        <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-soft)' }}>Nothing picking up yawa reactions in this window.</p>
        </div>
      ) : (
        rows.map((r) => (
          <div key={r.post_id} className="card velocity-row">
            <p style={{ margin: '0 0 var(--sp-2)', fontSize: 'var(--fs-sm)' }}>{r.content_preview || '(no preview available)'}</p>
            <div style={{ display: 'flex', gap: 'var(--sp-4)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {REACTION_EMOJI.yawa} {r.yawa_count_window} in window
              </span>
              <span>{r.per_hour}/hr</span>
            </div>
          </div>
        ))
      )}
    </>
  );
}
