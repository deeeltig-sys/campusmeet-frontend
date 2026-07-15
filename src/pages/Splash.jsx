import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import campmeetLogo from '../assets/campmeet-logo.png';

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => navigate('/onboarding'), 1800);
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
      <img
        src={campmeetLogo}
        alt="CampMEET"
        style={{ width: 180, animation: 'fadeIn 0.6s ease' }}
      />
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
