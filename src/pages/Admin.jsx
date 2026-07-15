import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AdminAPI } from '../api/client';
import BackHeader from '../components/BackHeader';

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/feed');
      return;
    }
    load();
  }, [user, navigate, load]);

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
    <div className="screen">
      <BackHeader eyebrow="Admin" title="Verify USTED students" fallback="/feed" />

      {error && <div className="banner-error">{error}</div>}

      {loading ? (
        <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
      ) : pending.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-soft)' }}>No pending verifications. All caught up.</p>
        </div>
      ) : (
        pending.map((u) => (
          <div key={u.id} className="card" style={{ marginBottom: 'var(--sp-3)' }}>
            <strong>{u.full_name}</strong>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)', margin: '4px 0 var(--sp-3)' }}>
              {u.student_id_number}
            </p>
            <button
              className="btn btn-gold btn-block"
              style={{ padding: '10px' }}
              disabled={actioning === u.id}
              onClick={() => handleVerify(u.id)}
            >
              {actioning === u.id ? 'Verifying…' : 'Verify USTED student'}
            </button>
          </div>
        ))
      )}
    </div>
  );
}
