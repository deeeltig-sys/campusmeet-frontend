import { NavLink } from 'react-router-dom';

const tabs = [
  { to: '/feed', label: 'Feed', icon: FeedIcon },
  { to: '/create', label: 'Post', icon: PlusIcon },
  { to: '/profile', label: 'Profile', icon: ProfileIcon },
];

export default function BottomNav() {
  return (
    <nav style={styles.nav}>
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          style={({ isActive }) => ({
            ...styles.tab,
            color: isActive ? 'var(--maroon-deep)' : 'var(--ink-soft)',
          })}
        >
          {({ isActive }) => (
            <>
              <Icon active={isActive} />
              <span style={styles.label}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function FeedIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="4" rx="1.5" fill={active ? 'var(--maroon)' : 'var(--ink-soft)'} />
      <rect x="3" y="10" width="18" height="4" rx="1.5" fill={active ? 'var(--maroon)' : 'var(--ink-soft)'} opacity="0.7" />
      <rect x="3" y="16" width="18" height="4" rx="1.5" fill={active ? 'var(--maroon)' : 'var(--ink-soft)'} opacity="0.45" />
    </svg>
  );
}
function PlusIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill={active ? 'var(--maroon)' : 'var(--ink-soft)'} />
      <path d="M12 7v10M7 12h10" stroke="var(--gold-bright)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function ProfileIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" fill={active ? 'var(--maroon)' : 'var(--ink-soft)'} />
      <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" fill={active ? 'var(--maroon)' : 'var(--ink-soft)'} opacity="0.85" />
    </svg>
  );
}

const styles = {
  nav: {
    display: 'flex',
    borderTop: '1px solid var(--line)',
    background: '#fff',
    padding: '10px 0 calc(10px + env(safe-area-inset-bottom))',
    position: 'sticky',
    bottom: 0,
  },
  tab: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.6875rem',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
};
