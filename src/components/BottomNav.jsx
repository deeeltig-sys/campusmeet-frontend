import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { NotificationsAPI, ConversationsAPI, QuestsAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useIncomingMessages } from '../hooks/useIncomingMessages';
import { Dawuro, Nkonsonkonson, Aya } from './AdinkraIcons';

const tabs = [
  { to: '/feed', label: 'Feed', icon: FeedIcon },
  { to: '/friends', label: 'Friends', icon: FriendsIcon },
  { to: '/create', label: 'Post', icon: PlusIcon },
  { to: '/notifications', label: 'Alerts', icon: BellIcon, badge: 'notifications' },
  { to: '/inbox', label: 'Chats', icon: InboxIcon, badge: 'chats' },
  { to: '/profile', label: 'Profile', icon: ProfileIcon },
];

export default function BottomNav() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const [unreadChats, setUnreadChats] = useState(0);
  const [quests, setQuests] = useState([]);
  const navigate = useNavigate();
  // Desktop-only rail state — thin icon-only by default, expands to show
  // labels when tapped. No effect below 768px (mobile keeps the fixed
  // bottom bar it always had; see .bottom-nav-toggle's display:none there).
  const [expanded, setExpanded] = useState(false);

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

  // Realtime layer on top of the poll above: when it's available, a
  // new message bumps the badge within a second or two instead of
  // waiting up to 30s. The poll itself is left untouched as the
  // fallback — if a campus network blocks websockets, this hook just
  // no-ops and the existing 30s poll keeps working exactly as before.
  useIncomingMessages(user?.id, () => {
    ConversationsAPI.unreadCount()
      .then((data) => setUnreadChats(data?.count || 0))
      .catch(() => {});
  });

  // Desktop-only quest section, fetched once — mobile never renders
  // this (see .nav-quest-section / .nav-quest-collapsed's display:none
  // below 768px), so there's no point polling it the way unread counts
  // are polled. If the fetch fails, quests stays [] and the section
  // below just doesn't render — no error state needed for something
  // that's a nice-to-have, not a core screen.
  useEffect(() => {
    QuestsAPI.mine()
      .then((data) => setQuests(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const questsDone = quests.filter((q) => q.completed).length;
  const questsTotal = quests.length;
  // Grouped the same way Quests.jsx groups its own list (cadence:
  // weekly/monthly) — reused here so the two screens read as the same
  // system rather than the nav inventing its own grouping.
  const weeklyQuests = quests.filter((q) => q.cadence === 'weekly');
  const monthlyQuests = quests.filter((q) => q.cadence === 'monthly');

  const badgeCounts = { notifications: unread, chats: unreadChats };

  return (
    <nav className={`bottom-nav${expanded ? ' bottom-nav--expanded' : ''}`}>
      <button
        type="button"
        className="bottom-nav-toggle"
        aria-label={expanded ? 'Collapse menu' : 'Expand menu'}
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <MenuIcon />
        <span className="bottom-nav-label">Menu</span>
      </button>
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
              // Collapse the rail back to icon-only after picking a
              // destination — matches the "only bigger while tapped
              // open" behaviour asked for, instead of staying expanded.
              setExpanded(false);
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

      {/* Desktop-only — see .nav-quest-section / .nav-quest-collapsed in
          global.css for the display:none that keeps both off mobile
          entirely. Modeled on Claude's sidebar: a labeled "Recents"-
          style section instead of one summary card, so the rail
          surfaces actual quest tasks (grouped This week / This month,
          same grouping Quests.jsx itself uses) once it's open, and
          falls back to a single icon + dot while collapsed. */}
      {questsTotal > 0 && (
        expanded ? (
          <div className="nav-quest-section">
            {weeklyQuests.length > 0 && (
              <>
                <p className="eyebrow nav-quest-label">This week</p>
                {weeklyQuests.map((q) => (
                  <QuestRow key={q.id} q={q} onOpen={() => { navigate('/quests'); setExpanded(false); }} />
                ))}
              </>
            )}
            {monthlyQuests.length > 0 && (
              <>
                <p className="eyebrow nav-quest-label">This month</p>
                {monthlyQuests.map((q) => (
                  <QuestRow key={q.id} q={q} onOpen={() => { navigate('/quests'); setExpanded(false); }} />
                ))}
              </>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="nav-quest-collapsed"
            onClick={() => navigate('/quests')}
            aria-label={`Quests — ${questsDone} of ${questsTotal} complete`}
            title="Quests"
          >
            <Aya size={20} strokeWidth={1.8} />
            {questsDone < questsTotal && <span className="nav-quest-dot" aria-hidden="true" />}
          </button>
        )
      )}
    </nav>
  );
}

function QuestRow({ q, onOpen }) {
  const pct = Math.min(100, Math.round((q.progress_count / q.target_count) * 100));
  return (
    <button type="button" className="nav-quest-row" onClick={onOpen}>
      <span className="nav-quest-row-top">
        <span className="nav-quest-row-title">{q.completed && '✓ '}{q.title}</span>
        <span className="nav-quest-row-points">+{q.points_reward}</span>
      </span>
      <span className="nav-quest-row-bar">
        <span
          className="nav-quest-row-fill"
          style={{ width: `${pct}%`, background: q.completed ? 'var(--gold-bright)' : 'var(--maroon)' }}
        />
      </span>
    </button>
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 6h18M3 12h18M3 18h18" stroke="var(--ink-soft)" strokeWidth="2" strokeLinecap="round" />
    </svg>
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
