import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FriendsAPI, UsersAPI } from '../api/client';
import VerifiedBadge from '../components/VerifiedBadge';

const TABS = [
  { key: 'friends', label: 'Friends' },
  { key: 'requests', label: 'Requests' },
  { key: 'discover', label: 'Discover' },
  { key: 'all', label: 'All Students' },
];

export default function Friends() {
  const [tab, setTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Find-anyone-by-name search — this is the actual "Friends page is
  // where you find all people on the platform" ask. Separate from the
  // three tabs below; searching replaces the tab content entirely
  // while there's a query typed, same as Facebook's Find Friends.
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      UsersAPI.search(trimmed)
        .then((data) => setSearchResults(Array.isArray(data) ? data : []))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300); // debounced — no need to hit the backend on every keystroke
    return () => clearTimeout(handle);
  }, [query]);

  const [allStudents, setAllStudents] = useState([]);

  const load = useCallback(async (activeTab) => {
    setError('');
    try {
      if (activeTab === 'friends') {
        setFriends(await FriendsAPI.list());
      } else if (activeTab === 'requests') {
        const [inc, out] = await Promise.all([FriendsAPI.requests('incoming'), FriendsAPI.requests('outgoing')]);
        setIncoming(Array.isArray(inc) ? inc : []);
        setOutgoing(Array.isArray(out) ? out : []);
      } else if (activeTab === 'all') {
        setAllStudents(await UsersAPI.all());
      } else {
        setSuggestions(await FriendsAPI.suggestions());
      }
    } catch (err) {
      setError(err.message || 'Could not load this.');
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
      setError(err.message || 'Could not accept.');
    }
  }
  async function handleDecline(requestId) {
    try {
      await FriendsAPI.decline(requestId);
      setIncoming((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      setError(err.message || 'Could not decline.');
    }
  }
  async function handleCancel(requestId) {
    try {
      await FriendsAPI.cancel(requestId);
      setOutgoing((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      setError(err.message || 'Could not cancel.');
    }
  }
  async function handleSendFromSuggestion(userId) {
    try {
      await FriendsAPI.send(userId);
      setSuggestions((prev) => prev.filter((s) => s.id !== userId));
    } catch (err) {
      setError(err.message || 'Could not send request.');
    }
  }

  return (
    <div className="screen">
      <header style={{ marginBottom: 'var(--sp-3)' }}>
        <p className="eyebrow">Friends</p>
        <h1 className="h-display" style={{ fontSize: 'var(--fs-xl)', marginBottom: 'var(--sp-3)' }}>
          Your CampusMEET circle
        </h1>
        <div style={{ display: 'flex', gap: 'var(--sp-2)', overflowX: 'auto', paddingBottom: 2 }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={tab === t.key ? 'btn btn-primary' : 'btn btn-ghost'}
              style={{ padding: '8px 16px', flexShrink: 0, whiteSpace: 'nowrap' }}
              onClick={() => setTab(t.key)}
            >
              {t.label}{t.key === 'requests' && incoming.length > 0 ? ` (${incoming.length})` : ''}
            </button>
          ))}
        </div>
      </header>

      {/* Find-anyone-by-name — the actual "this page is where you find
          all people on the platform" feature. */}
      <div style={{ position: 'relative', marginBottom: 'var(--sp-3)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>
          <circle cx="10.5" cy="10.5" r="6.5" stroke="var(--ink-soft)" strokeWidth="2" />
          <path d="M20 20l-4.35-4.35" stroke="var(--ink-soft)" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people by name…"
          style={{
            width: '100%', padding: '10px 12px 10px 36px', border: '1px solid var(--line)',
            borderRadius: 999, fontSize: 'var(--fs-sm)', boxSizing: 'border-box',
          }}
        />
      </div>

      {error && <div className="banner-error">{error}</div>}

      {query.trim().length >= 2 ? (
        searching ? (
          <p style={{ color: 'var(--ink-soft)' }}>Searching…</p>
        ) : searchResults.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)' }}>No one found matching "{query.trim()}".</p>
        ) : (
          searchResults.map((person) => (
            <PersonRow key={person.id} person={person} onClick={() => navigate(`/profile/${person.id}`)} />
          ))
        )
      ) : (
        <>
          {loading && <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>}

      {!loading && tab === 'friends' && (
        friends.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)' }}>No friends yet — browse a profile's friends list or check Discover.</p>
        ) : (
          friends.map((f) => <PersonRow key={f.id} person={f} onClick={() => navigate(`/profile/${f.id}`)} />)
        )
      )}

      {!loading && tab === 'requests' && (
        <>
          {incoming.length > 0 && (
            <>
              <p className="eyebrow" style={{ margin: 'var(--sp-3) 0 var(--sp-2)' }}>Incoming</p>
              {incoming.map((r) => (
                <PersonRow
                  key={r.id} person={r.user} onClick={() => navigate(`/profile/${r.user.id}`)}
                  action={
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" className="btn btn-primary" style={{ padding: '6px 12px' }} onClick={(e) => { e.stopPropagation(); handleAccept(r.id); }}>Accept</button>
                      <button type="button" className="btn btn-ghost" style={{ padding: '6px 12px' }} onClick={(e) => { e.stopPropagation(); handleDecline(r.id); }}>Decline</button>
                    </div>
                  }
                />
              ))}
            </>
          )}
          {outgoing.length > 0 && (
            <>
              <p className="eyebrow" style={{ margin: 'var(--sp-3) 0 var(--sp-2)' }}>Sent</p>
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
        </>
      )}

      {!loading && tab === 'discover' && (
        suggestions.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)' }}>
            Nothing yet — this fills in once you've got a friend or two, based on who they know.
          </p>
        ) : (
          suggestions.map((s) => (
            <PersonRow
              key={s.id} person={s} onClick={() => navigate(`/profile/${s.id}`)}
              subtitle={`${s.mutual_friends} mutual friend${s.mutual_friends === 1 ? '' : 's'}`}
              action={
                <button type="button" className="btn btn-primary" style={{ padding: '6px 12px' }} onClick={(e) => { e.stopPropagation(); handleSendFromSuggestion(s.id); }}>
                  Add
                </button>
              }
            />
          ))
        )
      )}

      {!loading && tab === 'all' && (
        allStudents.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)' }}>No other students yet.</p>
        ) : (
          allStudents.map((s) => <PersonRow key={s.id} person={s} onClick={() => navigate(`/profile/${s.id}`)} />)
        )
      )}
        </>
      )}
    </div>
  );
}

function PersonRow({ person, onClick, action, subtitle }) {
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
          <strong style={{ fontSize: 'var(--fs-sm)' }}>{person.full_name || 'Student'}</strong>
          <VerifiedBadge verified={person.verified} size={13} />
        </div>
        {subtitle && <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', margin: '2px 0 0' }}>{subtitle}</p>}
      </div>
      {action}
    </button>
  );
}
