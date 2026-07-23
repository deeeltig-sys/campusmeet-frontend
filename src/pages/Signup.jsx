import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UniversitiesAPI } from '../api/client';
import campmeetLogo from '../assets/campmeet-logo.png';
import BackHeader from '../components/BackHeader';

export default function Signup() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [universities, setUniversities] = useState([]);
  const [universityName, setUniversityName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Still fetched for the autocomplete suggestions — typing "K" should
    // surface KNUST, Knutsford, etc. — but no longer required to load
    // for signup to work, since any typed name is valid now.
    UniversitiesAPI.list()
      .then((data) => setUniversities(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const trimmed = universityName.trim();
    if (trimmed.length < 3) {
      setError('Please enter your university or institution name.');
      return;
    }

    setBusy(true);
    try {
      // Always sent as a name now — get_or_create_university() on the
      // backend matches it against existing schools (any country, not
      // just Ghana) or creates a new one if it's genuinely new. This is
      // what makes signing up from outside Ghana possible without us
      // pre-seeding every institution on earth.
      const payload = { ...form, university_name: trimmed };
      const res = await signup(payload);
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
        <img src={campmeetLogo} alt="CampusMEET" style={{ width: 84, marginBottom: 'var(--sp-3)' }} />
        <h1 className="h-display" style={{ fontSize: 'var(--fs-xl)' }}>Create your account</h1>
        <p style={{ color: 'var(--ink-soft)', fontSize: 'var(--fs-sm)' }}>
          Join students from campuses across Ghana.
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
          <label htmlFor="university">University / institution</label>
          <input
            id="university"
            required
            list="university-suggestions"
            value={universityName}
            onChange={(e) => setUniversityName(e.target.value)}
            placeholder="e.g. KNUST, University of Lagos…"
            autoComplete="off"
          />
          {/* Suggestions only — typing anything not in this list still
              works fine, it just creates a new campus on submit. This is
              what makes signup work outside Ghana without us having to
              pre-load every institution in advance. */}
          <datalist id="university-suggestions">
            {universities.map((u) => (
              <option key={u.id} value={u.name} />
            ))}
          </datalist>
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
        Already on CampusMEET? <Link to="/login" style={{ color: 'var(--maroon)', fontWeight: 600 }}>Sign in</Link>
      </p>
    </div>
  );
}
