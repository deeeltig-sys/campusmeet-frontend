import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { NotificationsAPI } from '../api/client';

const tabs = [
  { to: '/feed', label: 'Feed', icon: FeedIcon },
  { to: '/search', label: 'Search', icon: SearchIcon },
  { to: '/create', label: 'Post', icon: PlusIcon },
  { to: '/inbox', label: 'Inbox', icon: InboxIcon, badge: true },
  { to: '/profile', label: 'Profile', icon: ProfileIcon },
];

export default function BottomNav() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    function poll() {
      // No push notifications yet (that needs FCM set up separately) —
      // this is just a lightweight poll while the app is open, enough
      // to surface new activity without a real-time connection.
      NotificationsAPI.unreadCount()
        .then((data) => { if (!cancelled) setUnread(data?.count || 0); })
        .catch(() => {});
    }
    poll();
    const interval = setInterval(poll, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  return (
    <nav style={styles.nav}>
      {tabs.map(({ to, label, icon: Icon, badge }) => (
        <NavLink
          key={to}
          to={to}
          onClick={(e) => {
            // Tapping Feed while already ON Feed is a dead click by
            // default (react-router won't re-navigate to the same
            // route) — that's what the CTO flagged. This makes it act
            // like Instagram/X: tapping home again refreshes.
            if (to === '/feed' && window.location.pathname === '/feed') {
              window.dispatchEvent(new CustomEvent('campusmeet:refresh-feed'));
            }
          }}
          style={({ isActive }) => ({
            ...styles.tab,
            color: isActive ? 'var(--maroon-deep)' : 'var(--ink-soft)',
          })}
        >
          {({ isActive }) => (
            <>
              <div style={{ position: 'relative' }}>
                <Icon active={isActive} />
                {badge && unread > 0 && <span style={styles.badge}>{unread > 9 ? '9+' : unread}</span>}
              </div>
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
function SearchIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="10.5" cy="10.5" r="6.5" stroke={active ? 'var(--maroon)' : 'var(--ink-soft)'} strokeWidth="2" />
      <path d="M20 20l-4.35-4.35" stroke={active ? 'var(--maroon)' : 'var(--ink-soft)'} strokeWidth="2" strokeLinecap="round" />
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
function InboxIcon({ active }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M4 6h16v12H4z" stroke={active ? 'var(--maroon)' : 'var(--ink-soft)'} strokeWidth="2" strokeLinejoin="round" />
      <path d="M4 7l8 6 8-6" stroke={active ? 'var(--maroon)' : 'var(--ink-soft)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    padding: '0 4px',
    borderRadius: 8,
    background: 'var(--maroon)',
    color: '#fff',
    fontSize: '0.625rem',
    fontFamily: 'var(--font-mono)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
};
