import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import campmeetLogo from '../assets/campmeet-logo.png';
import GoldSparkle from '../components/GoldSparkle';
import { getToken } from '../api/client';

const ONBOARDED_KEY = 'campmeet_onboarded';

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => {
      // A stored session on this device wins over everything else —
      // straight to the feed. If that token's actually expired,
      // AuthContext/ProtectedLayout quietly falls back to /login on
      // its own; Splash doesn't need to know the difference.
      if (getToken()) {
        navigate('/feed', { replace: true });
        return;
      }
      // No session, but this device has already been walked through
      // the CampMEET/USTED intro before — a real new user only sees
      // it once, ever, not on every relaunch.
      const seenOnboarding = localStorage.getItem(ONBOARDED_KEY) === 'true';
      navigate(seenOnboarding ? '/login' : '/onboarding', { replace: true });
    }, 1800);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--maroon-deep)',
        gap: 'var(--sp-5)',
      }}
    >
      <div style={{ position: 'relative', width: 180, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <GoldSparkle count={5} />
        <img
          src={campmeetLogo}
          alt="CampMEET"
          style={{ width: 180, animation: 'fadeIn 0.6s ease', position: 'relative', zIndex: 1 }}
        />
      </div>
      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.6875rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--gold)',
          position: 'absolute',
          bottom: 'var(--sp-6)',
          textAlign: 'center',
          width: '100%',
        }}
      >
        Created by Makaveli X<br />
        Founder &amp; Lead Developer, ProjectX Web Development
      </p>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
