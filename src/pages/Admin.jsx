import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AdminAPI } from '../api/client';
import BackHeader from '../components/BackHeader';
import GoldSparkle from '../components/GoldSparkle';
import { YawaIcon } from '../components/icons';

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('verify');

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/feed');
    }
  }, [user, navigate]);

  return (
    <div className="screen">
      <BackHeader eyebrow="Admin" title="Panel" fallback="/feed" />

      <div className="tab-row">
        <button
          type="button"
          className={`tab-btn${tab === 'verify' ? ' active' : ''}`}
          onClick={() => setTab('verify')}
        >
          Verify students
        </button>
        <button
          type="button"
          className={`tab-btn${tab === 'velocity' ? ' active' : ''}`}
          onClick={() => setTab('velocity')}
        >
          Yawa activity
        </button>
      </div>

      {tab === 'verify' ? <VerifyPanel /> : <VelocityPanel />}
    </div>
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
                <YawaIcon size={14} color="var(--maroon)" /> {r.yawa_count_window} in window
              </span>
              <span>{r.per_hour}/hr</span>
            </div>
          </div>
        ))
      )}
    </>
  );
}
