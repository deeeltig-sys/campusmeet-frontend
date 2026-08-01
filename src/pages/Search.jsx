import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PostsAPI, UsersAPI, HashtagsAPI } from '../api/client';
import PostCard from '../components/PostCard';
import VerifiedBadge from '../components/VerifiedBadge';

export default function Search() {
  const location = useLocation();
  const navigate = useNavigate();
  // Friends' search-people icon (and anywhere else that wants to land
  // straight on People instead of the default Posts tab) passes this
  // via navigate(..., { state: { mode: 'people' } }).
  const [mode, setMode] = useState(location.state?.mode === 'people' ? 'people' : 'posts');
  const [query, setQuery] = useState('');
  const [posts, setPosts] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const hitFired = useRef(new Set());
  const [trending, setTrending] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  // Loaded once up front — this is what shows in Posts mode before
  // anyone's typed anything, the same "Explore" role IG's search tab
  // plays when it's empty.
  useEffect(() => {
    HashtagsAPI.trending()
      .then((data) => setTrending(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setTrendingLoading(false));
  }, []);

  const runSearch = useCallback(async (q, searchMode) => {
    if (q.trim().length < 2) {
      setPosts([]);
      setPeople([]);
      setSearched(false);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (searchMode === 'posts') {
        const data = await PostsAPI.search(q.trim());
        const results = Array.isArray(data) ? data : [];
        setPosts(results);
        setSearched(true);

        // Registers a search hit once per post per session — this feeds
        // search_hit_count, one of the three signals behind feed_score(),
        // so posts that keep surfacing in searches rank a little higher
        // over time. Fire-and-forget; a failed hit shouldn't block results
        // from showing.
        results.forEach((p) => {
          if (!hitFired.current.has(p.id)) {
            hitFired.current.add(p.id);
            PostsAPI.registerSearchHit(p.id).catch(() => {});
          }
        });
      } else {
        const data = await UsersAPI.search(q.trim());
        setPeople(Array.isArray(data) ? data : []);
        setSearched(true);
      }
    } catch (err) {
      setError(err.message || 'Search failed. Try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced — waits for a pause in typing rather than firing on every
  // keystroke, so a full word doesn't trigger four separate requests.
  useEffect(() => {
    const t = setTimeout(() => runSearch(query, mode), 400);
    return () => clearTimeout(t);
  }, [query, mode, runSearch]);

  async function handleReact(postId, type) {
    const current = posts.find((p) => p.id === postId);
    if (!current) return;

    const wasSame = current.user_reaction === type;
    const hadAny = current.user_reaction != null;
    const nextReaction = wasSame ? null : type;
    const countDelta = wasSame ? -1 : hadAny ? 0 : 1;

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, user_reaction: nextReaction, reaction_count: p.reaction_count + countDelta }
          : p
      )
    );

    try {
      if (wasSame) {
        await PostsAPI.unreact(postId);
      } else {
        await PostsAPI.react(postId, type);
      }
    } catch {
      runSearch(query, mode);
    }
  }

  const results = mode === 'posts' ? posts : people;

  return (
    <div className="screen">
      <header style={{ marginBottom: 'var(--sp-5)' }}>
        <p className="eyebrow">Search</p>
        <h1 className="h-display" style={{ fontSize: 'var(--fs-xl)', marginBottom: 'var(--sp-4)' }}>
          Find something on campus
        </h1>

        <div style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
          <button
            type="button"
            className={mode === 'posts' ? 'btn btn-primary' : 'btn btn-ghost'}
            style={{ padding: '8px 16px', flex: 1 }}
            onClick={() => setMode('posts')}
          >
            Posts
          </button>
          <button
            type="button"
            className={mode === 'people' ? 'btn btn-primary' : 'btn btn-ghost'}
            style={{ padding: '8px 16px', flex: 1 }}
            onClick={() => setMode('people')}
          >
            People
          </button>
        </div>

        <div className="search-input-wrap">
          <SearchIcon />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mode === 'posts' ? 'Search posts…' : 'Search students…'}
            autoFocus
            className="search-input"
          />
        </div>
      </header>

      {error && <div className="banner-error">{error}</div>}

      {loading && <p style={{ color: 'var(--ink-soft)' }}>Searching…</p>}

      {!loading && searched && results.length === 0 && (
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-soft)' }}>Nothing matches "{query.trim()}" yet.</p>
        </div>
      )}

      {!loading && !searched && query.trim().length > 0 && query.trim().length < 2 && (
        <p style={{ color: 'var(--ink-soft)', fontSize: 'var(--fs-sm)' }}>Keep typing — at least 2 characters.</p>
      )}

      {!searched && mode === 'posts' && query.trim().length === 0 && (
        <div style={{ marginBottom: 'var(--sp-4)' }}>
          <p className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>Trending on campus</p>
          {trendingLoading ? (
            <p style={{ color: 'var(--ink-soft)', fontSize: 'var(--fs-sm)' }}>Loading…</p>
          ) : trending.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)', fontSize: 'var(--fs-sm)' }}>Nothing trending yet — be the first to start a tag.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              {trending.map((h) => (
                <button
                  key={h.tag}
                  type="button"
                  onClick={() => navigate(`/hashtag/${h.tag}`)}
                  className="card"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                >
                  <strong style={{ fontSize: 'var(--fs-sm)', color: 'var(--maroon)' }}>#{h.tag}</strong>
                  <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)' }}>
                    {h.post_count} {h.post_count === 1 ? 'post' : 'posts'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && mode === 'posts' &&
        posts.map((post) => <PostCard key={post.id} post={post} onReact={handleReact} />)}

      {!loading && mode === 'people' &&
        people.map((person) => (
          <Link
            to={`/profile/${person.id}`}
            key={person.id}
            className="card"
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 'var(--sp-3)', textDecoration: 'none', color: 'inherit' }}
          >
            <div className="avatar-circle">
              {person.avatar_url ? <img src={person.avatar_url} alt="" /> : (person.full_name ? person.full_name.charAt(0) : '?')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <strong style={{ fontSize: 'var(--fs-sm)' }}>{person.full_name || 'Student'}</strong>
              <VerifiedBadge verified={person.verified} size={14} />
            </div>
          </Link>
        ))}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" stroke="var(--ink-soft)" strokeWidth="1.8" />
      <path d="M20 20l-4.35-4.35" stroke="var(--ink-soft)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
