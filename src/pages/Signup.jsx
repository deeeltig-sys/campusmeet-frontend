import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import campmeetLogo from '../assets/campmeet-logo.png';
import BackHeader from '../components/BackHeader';

export default function Signup() {
  const [form, setForm] = useState({ full_name: '', email: '', student_id_number: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await signup(form);
      if (res?.access_token) {
        navigate('/feed');
      } else {
        // Some Supabase configs require email confirmation before a session exists.
        navigate('/login');
      }
    } catch (err) {
      setError(err.message || 'Could not create your account. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <BackHeader fallback="/login" />
      <div style={{ textAlign: 'center', marginBottom: 'var(--sp-5)' }}>
        <img src={campmeetLogo} alt="CampMEET" style={{ width: 84, marginBottom: 'var(--sp-3)' }} />
        <h1 className="h-display" style={{ fontSize: 'var(--fs-xl)' }}>Create your account</h1>
        <p style={{ color: 'var(--ink-soft)', fontSize: 'var(--fs-sm)' }}>
          You'll get a verification seal once your USTED student ID is confirmed.
        </p>
      </div>

      {error && <div className="banner-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="full_name">Full name</label>
          <input id="full_name" required value={form.full_name} onChange={(e) => update('full_name', e.target.value)} placeholder="Prince Osei Owusu" />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="you@example.com" />
        </div>
        <div className="field">
          <label htmlFor="student_id">USTED student ID</label>
          <input id="student_id" required value={form.student_id_number} onChange={(e) => update('student_id_number', e.target.value)} placeholder="52XXXXXXXX" />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" required minLength={8} value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="At least 8 characters" />
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 'var(--sp-5)', color: 'var(--ink-soft)', fontSize: 'var(--fs-sm)' }}>
        Already on CampMEET? <Link to="/login" style={{ color: 'var(--maroon)', fontWeight: 600 }}>Sign in</Link>
      </p>
    </div>
  );
}
