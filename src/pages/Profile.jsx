import { useAuth } from '../context/AuthContext';
import VerifiedBadge from '../components/VerifiedBadge';
import campmeetLogo from '../assets/campmeet-logo.png';

export default function Profile() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="screen">
      <header style={{ marginBottom: 'var(--sp-5)' }}>
        <p className="eyebrow">Your profile</p>
      </header>

      <div
        className="card"
        style={{
          background: user.verified ? 'var(--maroon-light)' : '#fff',
          borderColor: user.verified ? 'var(--gold)' : 'var(--line)',
          textAlign: 'center',
          marginBottom: 'var(--sp-4)',
        }}
      >
        <div
          style={{
            width: 72, height: 72, borderRadius: '999px', margin: '0 auto var(--sp-3)',
            background: 'var(--maroon)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: 'var(--fs-2xl)', color: 'var(--gold-bright)',
          }}
        >
          {user.full_name?.charAt(0) || '?'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <h2 className="h-display" style={{ fontSize: 'var(--fs-lg)', margin: 0 }}>{user.full_name}</h2>
          <VerifiedBadge verified={user.verified} />
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', marginTop: 4 }}>
          {user.student_id_number}
        </p>
        <p style={{ fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-2)', color: user.verified ? 'var(--maroon-deep)' : 'var(--ink-soft)' }}>
          {user.verified ? 'Verified USTED student' : 'Verification pending — an admin will confirm your student ID.'}
        </p>
      </div>

      <button className="btn btn-ghost btn-block" onClick={logout}>
        Sign out
      </button>

      <footer style={{ textAlign: 'center', marginTop: 'var(--sp-7)' }}>
        <img src={campmeetLogo} alt="CampMEET" style={{ width: 56, opacity: 0.85, marginBottom: 'var(--sp-2)' }} />
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--ink-soft)', letterSpacing: '0.04em' }}>
          Created by Makaveli X<br />Founder &amp; Lead Developer, ProjectX Web Development
        </p>
      </footer>
    </div>
  );
}
