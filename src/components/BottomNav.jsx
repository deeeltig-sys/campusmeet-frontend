import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { NotificationsAPI, ConversationsAPI } from '../api/client';
import { Dawuro, Nkonsonkonson } from './AdinkraIcons';

const tabs = [
  { to: '/feed', label: 'Feed', icon: FeedIcon },
  { to: '/friends', label: 'Friends', icon: FriendsIcon },
  { to: '/create', label: 'Post', icon: PlusIcon },
  { to: '/notifications', label: 'Alerts', icon: BellIcon, badge: 'notifications' },
  { to: '/inbox', label: 'Chats', icon: InboxIcon, badge: 'chats' },
  { to: '/profile', label: 'Profile', icon: ProfileIcon },
];

export default function BottomNav() {
  const [unread, setUnread] = useState(0);
  const [unreadChats, setUnreadChats] = useState(0);

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
    // The Notifications page can't reach into this component's state
    // directly, so it announces read-state changes via this event
    // instead of the badge sitting stale until the next 30s tick.
    window.addEventListener('campusmeet:notifications-read', poll);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('campusmeet:notifications-read', poll);
    };
  }, []);

  // Chats gets its own badge and its own poll, independent of Alerts —
  // a new message, a reply, or a message request from someone not yet
  // accepted should all surface here, the same way any of those show
  // up in Alerts, without the two counts being mixed into one number.
  useEffect(() => {
    let cancelled = false;
    function pollChats() {
      ConversationsAPI.unreadCount()
        .then((data) => { if (!cancelled) setUnreadChats(data?.count || 0); })
        .catch(() => {});
    }
    pollChats();
    const interval = setInterval(pollChats, 30000);
    // Conversation.jsx marks messages read as soon as that thread is
    // opened (see routes/messages.py's GET /messages handler) — same
    // "don't wait for the next 30s tick" pattern as notifications.
    window.addEventListener('campusmeet:messages-read', pollChats);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('campusmeet:messages-read', pollChats);
    };
  }, []);

  const badgeCounts = { notifications: unread, chats: unreadChats };

  return (
    <nav className="bottom-nav">
      {tabs.map(({ to, label, icon: Icon, badge }) => {
        const count = badge ? badgeCounts[badge] : 0;
        return (
          <NavLink
            key={to}
            to={to}
            className="bottom-nav-tab"
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
              color: isActive ? 'var(--maroon-deep)' : 'var(--ink-soft)',
            })}
          >
            {({ isActive }) => (
              <>
                <div style={{ position: 'relative' }}>
                  <Icon active={isActive} />
                  {count > 0 && <span style={styles.badge}>{count > 9 ? '9+' : count}</span>}
                </div>
                <span className="bottom-nav-label">{label}</span>
              </>
            )}
          </NavLink>
        );
      })}
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
function FriendsIcon({ active }) {
  // Nkonsonkonson — the chain-link symbol, meaning unity and human
  // relations. Swapped in for the generic two-circle icon.
  return (
    <span style={{ display: 'inline-flex', color: active ? 'var(--maroon)' : 'var(--ink-soft)' }}>
      <Nkonsonkonson size={22} strokeWidth={2} />
    </span>
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
function BellIcon({ active }) {
  // Dawuro — the gong-gong used by town criers to announce news,
  // meaning vigilance and the spreading of information. Swapped in
  // for the generic bell.
  return (
    <span style={{ display: 'inline-flex', color: active ? 'var(--maroon)' : 'var(--ink-soft)' }}>
      <Dawuro size={22} strokeWidth={1.8} />
    </span>
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
