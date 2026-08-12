import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FriendsAPI } from '../api/client';
import VerifiedBadge from '../components/VerifiedBadge';

// Facebook's Friends tab is really one flow, not three separate lists:
// requests you can act on right now, up top, then "People You May Know"
// underneath so there's always something to do even with an empty
// requests queue. That's the shape we're matching here — two tabs
// instead of three, with Discover folded into Requests.
const TABS = [
  { key: 'friends', label: 'Friends' },
  { key: 'requests', label: 'Requests' },
];

export default function Friends() {
  const location = useLocation();
  // A friend_request notification navigates here with
  // { state: { tab: 'requests' } } so it actually lands the person on
  // the requests they came to act on, not the default Friends tab.
  const [tab, setTab] = useState(location.state?.tab === 'requests' ? 'requests' : 'friends');
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [dismissed, setDismissed] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = useCallback(async (activeTab) => {
    setError('');
    try {
      if (activeTab === 'friends') {
        setFriends(await FriendsAPI.list());
      } else {
        // Requests + suggestions load together so the "People You May
        // Know" grid is already there the moment requests finish
        // rendering — no second loading flicker underneath them.
        const [inc, out, sugg] = await Promise.all([
          FriendsAPI.requests('incoming'),
          FriendsAPI.requests('outgoing'),
          FriendsAPI.suggestions(),
        ]);
        setIncoming(Array.isArray(inc) ? inc : []);
        setOutgoing(Array.isArray(out) ? out : []);
        setSuggestions(Array.isArray(sugg) ? sugg : []);
      }
    } catch (err) {
      setError(err.message || "This won't load right now.");
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load(tab).finally(() => setLoading(false));
  }, [tab, load]);

  async function handleAccept(requestId) {
    try {
      await FriendsAPI.accept(requestId);
      setIncoming((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      setError(err.message || "That didn't go through.");
    }
  }
  async function handleDecline(requestId) {
    try {
      await FriendsAPI.decline(requestId);
      setIncoming((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      setError(err.message || "That didn't go through.");
    }
  }
  async function handleCancel(requestId) {
    try {
      await FriendsAPI.cancel(requestId);
      setOutgoing((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      setError(err.message || "That didn't go through.");
    }
  }
  async function handleSendFromSuggestion(userId) {
    try {
      await FriendsAPI.send(userId);
      setSuggestions((prev) => prev.filter((s) => s.id !== userId));
    } catch (err) {
      setError(err.message || "That request didn't send.");
    }
  }
  function handleDismissSuggestion(userId) {
    // No "hide this suggestion" endpoint yet — this is a local-only
    // dismiss so a "not interested" tap doesn't feel ignored, but it
    // will reappear next session. Worth a real dismiss endpoint later
    // if this gets used a lot.
    setDismissed((prev) => new Set(prev).add(userId));
  }

  const visibleSuggestions = suggestions.filter((s) => !dismissed.has(s.id));

  return (
    <div className="screen">
      <header style={{ marginBottom: 'var(--sp-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p className="eyebrow">Friends</p>
            <h1 className="h-display" style={{ fontSize: 'var(--fs-xl)' }}>
              Your CampusMEET circle
            </h1>
          </div>
          <button
            type="button"
            aria-label="Search people"
            onClick={() => navigate('/search', { state: { mode: 'people' } })}
            style={{
              width: 38, height: 38, borderRadius: '50%', border: '1px solid var(--line)', background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="10.5" cy="10.5" r="6.5" stroke="var(--ink-soft)" strokeWidth="1.8" />
              <path d="M20 20l-4.35-4.35" stroke="var(--ink-soft)" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-3)' }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={tab === t.key ? 'btn btn-primary' : 'btn btn-ghost'}
              style={{ padding: '8px 16px', flex: 1 }}
              onClick={() => setTab(t.key)}
            >
              {t.label}{t.key === 'requests' && incoming.length > 0 ? ` (${incoming.length})` : ''}
            </button>
          ))}
        </div>
      </header>

      {error && <div className="banner-error">{error}</div>}
      {loading && <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>}

      {!loading && tab === 'friends' && (
        friends.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)' }}>No friends yet — browse a profile's friends list or check Requests.</p>
        ) : (
          friends.map((f) => <PersonRow key={f.id} person={f} onClick={() => navigate(`/profile/${f.id}`)} />)
        )
      )}

      {!loading && tab === 'requests' && (
        <>
          {incoming.length > 0 && (
            <>
              <p className="eyebrow" style={{ margin: '0 0 var(--sp-2)' }}>Friend requests</p>
              {incoming.map((r) => (
                <PersonRow
                  key={r.id} person={r.user} onClick={() => navigate(`/profile/${r.user.id}`)}
                  action={
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" className="btn btn-primary" style={{ padding: '6px 12px' }} onClick={(e) => { e.stopPropagation(); handleAccept(r.id); }}>Confirm</button>
                      <button type="button" className="btn btn-ghost" style={{ padding: '6px 12px' }} onClick={(e) => { e.stopPropagation(); handleDecline(r.id); }}>Delete</button>
                    </div>
                  }
                />
              ))}
            </>
          )}

          {outgoing.length > 0 && (
            <>
              <p className="eyebrow" style={{ margin: 'var(--sp-4) 0 var(--sp-2)' }}>Sent</p>
              {outgoing.map((r) => (
                <PersonRow
                  key={r.id} person={r.user} onClick={() => navigate(`/profile/${r.user.id}`)}
                  action={
                    <button type="button" className="btn btn-ghost" style={{ padding: '6px 12px' }} onClick={(e) => { e.stopPropagation(); handleCancel(r.id); }}>Cancel</button>
                  }
                />
              ))}
            </>
          )}

          {incoming.length === 0 && outgoing.length === 0 && (
            <p style={{ color: 'var(--ink-soft)' }}>No pending requests.</p>
          )}

          {/* People You May Know — the FB pattern this whole tab is built
              around: requests you can act on now, then a steady supply of
              people to add underneath, so the tab is never a dead end. */}
          {visibleSuggestions.length > 0 && (
            <>
              <p className="eyebrow" style={{ margin: 'var(--sp-5) 0 var(--sp-2)' }}>People you may know</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
                {visibleSuggestions.map((s) => (
                  <SuggestionCard
                    key={s.id}
                    person={s}
                    onClick={() => navigate(`/profile/${s.id}`)}
                    onAdd={() => handleSendFromSuggestion(s.id)}
                    onDismiss={() => handleDismissSuggestion(s.id)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function PersonRow({ person, onClick, action }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card"
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', width: '100%', marginBottom: 'var(--sp-2)', border: 'none', cursor: 'pointer', textAlign: 'left' }}
    >
      <div className="avatar-circle">
        {person.avatar_url ? <img src={person.avatar_url} alt="" /> : (person.full_name ? person.full_name.charAt(0) : '?')}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <strong className="name-shine" style={{ fontSize: 'var(--fs-sm)' }}>{person.full_name || 'Student'}</strong>
          <VerifiedBadge verified={person.verified} size={13} />
        </div>
      </div>
      {action}
    </button>
  );
}

// Facebook's "People You May Know" card: big square photo up top, name
// and mutual-friend count below, then a full-width primary Add action
// with a quiet dismiss next to it — a grid card, not a list row.
function SuggestionCard({ person, onClick, onAdd, onDismiss }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
      <button
        type="button"
        aria-label="Not interested"
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        style={{
          position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%',
          border: 'none', background: 'rgba(0,0,0,0.35)', color: '#fff', fontSize: '0.8rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 1,
        }}
      >
        ×
      </button>
      <button
        type="button"
        onClick={onClick}
        style={{
          width: '100%', aspectRatio: '1 / 1', border: 'none', cursor: 'pointer', padding: 0,
          background: 'var(--parchment, #f1ece2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {person.avatar_url ? (
          <img src={person.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--maroon)' }}>
            {person.full_name ? person.full_name.charAt(0) : '?'}
          </span>
        )}
      </button>
      <div style={{ padding: 'var(--sp-2) var(--sp-3) var(--sp-3)' }}>
        <button type="button" onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
          <strong className="name-shine" style={{ fontSize: 'var(--fs-sm)' }}>{person.full_name || 'Student'}</strong>
          <VerifiedBadge verified={person.verified} size={12} />
        </button>
        {typeof person.mutual_friends === 'number' && (
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', margin: '2px 0 0' }}>
            {person.mutual_friends} mutual friend{person.mutual_friends === 1 ? '' : 's'}
          </p>
        )}
        <button
          type="button"
          className="btn btn-primary"
          style={{ width: '100%', padding: '7px 0', marginTop: 'var(--sp-2)', fontSize: 'var(--fs-sm)' }}
          onClick={(e) => { e.stopPropagation(); onAdd(); }}
        >
          Add Friend
        </button>
      </div>
    </div>
  );
}
