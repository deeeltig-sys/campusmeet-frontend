import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UniversitiesAPI } from '../api/client';
import campmeetLogo from '../assets/campmeet-logo.png';
import BackHeader from '../components/BackHeader';

const OTHER_VALUE = '__other__';

export default function Signup() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '' });
  const [universities, setUniversities] = useState([]);
  const [universitiesError, setUniversitiesError] = useState('');
  const [selectedUniversity, setSelectedUniversity] = useState('');
  const [otherUniversityName, setOtherUniversityName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    UniversitiesAPI.list()
      .then((data) => setUniversities(Array.isArray(data) ? data : []))
      .catch(() => setUniversitiesError('Could not load the university list — you can still type yours in below.'));
  }, []);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const isOther = selectedUniversity === OTHER_VALUE;
    if (!selectedUniversity) {
      setError('Please select your university.');
      return;
    }
    if (isOther && !otherUniversityName.trim()) {
      setError('Please enter your university name.');
      return;
    }

    setBusy(true);
    try {
      const payload = {
        ...form,
        ...(isOther
          ? { university_name: otherUniversityName.trim() }
          : { university_id: selectedUniversity }),
      };
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
      {universitiesError && <div className="banner-error">{universitiesError}</div>}

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
          <label htmlFor="university">University</label>
          <select
            id="university"
            required
            value={selectedUniversity}
            onChange={(e) => setSelectedUniversity(e.target.value)}
          >
            <option value="" disabled>Select your university</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
            <option value={OTHER_VALUE}>Other — my school isn't listed</option>
          </select>
        </div>
        {selectedUniversity === OTHER_VALUE && (
          <div className="field">
            <label htmlFor="other_university">University name</label>
            <input
              id="other_university"
              required
              value={otherUniversityName}
              onChange={(e) => setOtherUniversityName(e.target.value)}
              placeholder="e.g. Accra Nursing College"
            />
          </div>
        )}
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
