import { useNavigate } from 'react-router-dom';

/**
 * Header with a tappable back arrow for any screen reached off the main
 * tab bar (Create Post, Admin, etc). Falls back to a fixed route if there's
 * no history to go back to (e.g. app opened directly on this screen).
 */
export default function BackHeader({ title, eyebrow, fallback = '/feed' }) {
  const navigate = useNavigate();

  function goBack() {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  }

  return (
    <header style={styles.wrap}>
      <button onClick={goBack} aria-label="Go back" style={styles.backBtn}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="var(--maroon-deep)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div>
        {eyebrow && <p className="eyebrow" style={{ margin: 0 }}>{eyebrow}</p>}
        {title && <h1 className="h-display" style={{ fontSize: 'var(--fs-xl)', margin: 0 }}>{title}</h1>}
      </div>
    </header>
  );
}

const styles = {
  wrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--sp-3)',
    marginBottom: 'var(--sp-5)',
  },
  backBtn: {
    width: 36,
    height: 36,
    minWidth: 36,
    borderRadius: '999px',
    border: '1.5px solid var(--line)',
    background: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
  },
};
