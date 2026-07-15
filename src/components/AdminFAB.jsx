import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminFAB() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user || user.role !== 'admin') return null;
  if (location.pathname === '/admin') return null;

  return (
    <button
      onClick={() => navigate('/admin')}
      aria-label="Open admin panel"
      title="Admin panel"
      style={{
        position: 'absolute',
        right: 16,
        bottom: 84,
        width: 48,
        height: 48,
        borderRadius: '999px',
        border: '1.5px solid var(--gold)',
        background: 'var(--maroon-deep)',
        color: 'var(--gold-bright)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'var(--shadow-raised)',
        cursor: 'pointer',
        zIndex: 20,
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2l7 3v6c0 5-3 8.5-7 11-4-2.5-7-6-7-11V5l7-3z"
          fill="var(--gold-bright)"
        />
        <path d="M9 12l2 2 4-4" stroke="var(--maroon-deep)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
