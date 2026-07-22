import { useState } from 'react';
import { AuthAPI } from '../api/client';
import BackHeader from '../components/BackHeader';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await AuthAPI.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err) {
      setError(err.message || 'Could not send the reset email.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <BackHeader fallback="/login" />
      <div style={{ marginBottom: 'var(--sp-5)' }}>
        <p className="eyebrow">Reset password</p>
        <h1 className="h-display" style={{ fontSize: 'var(--fs-xl)' }}>Forgot your password?</h1>
        <p style={{ color: 'var(--ink-soft)', fontSize: 'var(--fs-sm)' }}>
          Enter your email and we'll send you a link to reset it.
        </p>
      </div>

      {error && <div className="banner-error">{error}</div>}

      {sent ? (
        <p style={{ color: 'var(--ink-soft)' }}>
          If that email is registered, a reset link is on its way. Check your inbox.
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
    </div>
  );
}
