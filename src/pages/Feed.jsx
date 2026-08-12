import { useEffect, useState, useCallback, useRef, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { PostsAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import SuggestedPeople from '../components/SuggestedPeople';
import ReactorsModal from '../components/ReactorsModal';
import CommentsSheet from '../components/CommentsSheet';
import campmeetLogo from '../assets/campmeet-logo.png';
import StatusStrip from '../components/StatusStrip';

const PAGE_SIZE = 20;
const PULL_THRESHOLD = 70; // px of downward drag before a release triggers refresh

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reactorsPostId, setReactorsPostId] = useState(null);
  const [commentsPostId, setCommentsPostId] = useState(null);
  const [scope, setScope] = useState('campus'); // 'campus' | 'national'

  const { user } = useAuth();
  const navigate = useNavigate();

  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);
  const touchStartY = useRef(null);
  const [pullDistance, setPullDistance] = useState(0);

  // The FB/IG/X "New posts" pill: id of the newest post the person has
  // actually seen, plus whether a background peek found something newer.
  const latestSeenIdRef = useRef(null);
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);

  // ---- Initial load ----
  // feedSeedRef holds one seed per feed "session" — set fresh here on
  // every real load/refresh, then reused unchanged by loadMore below.
  // Without this, each infinite-scroll page got its own independent
  // random order from the backend (see feed_seeded_pagination_migration.sql)
  // and the whole feed would silently reshuffle under the person's thumb
  // on any re-fetch — this is what "react on a post and it disappears"
  // actually was.
  const feedSeedRef = useRef(null);

  const load = useCallback(async () => {
    setError('');
    try {
      feedSeedRef.current = null; // fresh load always gets a brand-new seed from the backend
      const data = await PostsAPI.feed(PAGE_SIZE, 0, scope);
      const list = Array.isArray(data) ? data : data?.posts || [];
      feedSeedRef.current = data?.seed ?? null;
      setPosts(list);
      setOffset(list.length);
      setHasMore(list.length === PAGE_SIZE);
      latestSeenIdRef.current = list[0]?.id ?? null;
      setNewPostsAvailable(false);
    } catch (err) {
      setError(err.message || "Your feed isn't loading right now.");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  // Tapping the Feed nav tab while already on /feed fires this — reuses
  // the exact same refresh path as pull-to-refresh so there's only one
  // place that logic lives.
  useEffect(() => {
    function onRefreshEvent() {
      handleRefresh();
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.addEventListener('campusmeet:refresh-feed', onRefreshEvent);
    return () => window.removeEventListener('campusmeet:refresh-feed', onRefreshEvent);
  }, []);

  // ---- Pull to refresh ----
  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    setError('');
    try {
      const data = await PostsAPI.feed(PAGE_SIZE, 0, scope);
      const list = Array.isArray(data) ? data : data?.posts || [];
      setPosts(list);
      setOffset(list.length);
      setHasMore(list.length === PAGE_SIZE);
      latestSeenIdRef.current = list[0]?.id ?? null;
      setNewPostsAvailable(false);
    } catch (err) {
      setError(err.message || "That refresh didn't work.");
    } finally {
      setRefreshing(false);
      setPullDistance(0);
    }
  }

  // ---- "New posts" pill ----
  // A light peek at just the newest post, on an interval, while the
  // person is reading further down the feed. This is what makes
  // pull-to-refresh feel like Facebook instead of a plain refresh
  // button: the app tells you there's something new rather than
  // waiting for you to go check.
  useEffect(() => {
    const interval = setInterval(async () => {
      if (refreshing || loading) return;
      try {
        const data = await PostsAPI.feed(1, 0, scope);
        const list = Array.isArray(data) ? data : data?.posts || [];
        const newestId = list[0]?.id;
        if (newestId && newestId !== latestSeenIdRef.current) {
          setNewPostsAvailable(true);
        }
      } catch {
        // A failed background peek is invisible to the person by design —
        // it just tries again on the next tick.
      }
    }, 45000);
    return () => clearInterval(interval);
  }, [scope, refreshing, loading]);

  function handleNewPostsClick() {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    handleRefresh();
  }

  function handleTouchStart(e) {
    // Only start tracking a pull when the feed is already scrolled to the
    // very top — otherwise a normal scroll-down gesture would trigger it.
    if (scrollRef.current && scrollRef.current.scrollTop <= 0) {
      touchStartY.current = e.touches[0].clientY;
    } else {
      touchStartY.current = null;
    }
  }

  function handleTouchMove(e) {
    if (touchStartY.current == null || refreshing) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) {
      // Diminishing resistance the further it's pulled, capped so it
      // never feels like it can be dragged forever.
      setPullDistance(Math.min(delta * 0.5, 90));
    }
  }

  function handleTouchEnd() {
    if (touchStartY.current == null) return;
    if (pullDistance >= PULL_THRESHOLD) {
      handleRefresh();
    } else {
      setPullDistance(0);
    }
    touchStartY.current = null;
  }

  function handleTouchCancel() {
    // The OS can interrupt a touch mid-gesture (incoming call, system
    // notification drawer) — without this the indicator could get stuck
    // half-open since neither touchmove nor touchend fires again.
    touchStartY.current = null;
    setPullDistance(0);
  }

  // ---- Infinite scroll ----
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || refreshing) return;
    setLoadingMore(true);
    try {
      const data = await PostsAPI.feed(PAGE_SIZE, offset, scope, feedSeedRef.current);
      const list = Array.isArray(data) ? data : data?.posts || [];
      setPosts((prev) => [...prev, ...list]);
      setOffset((prev) => prev + list.length);
      setHasMore(list.length === PAGE_SIZE);
    } catch {
      // A failed page-2 fetch shouldn't blank out the feed the person
      // is already looking at — just stop trying until they scroll again.
    } finally {
      setLoadingMore(false);
    }
  }, [offset, hasMore, loadingMore, refreshing, scope]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // ---- Reactions ----
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
      load();
    }
  }

  // ---- Edit / delete ----
  async function handleEditSave(postId, content) {
    // The PATCH endpoint returns the raw `posts` row, not the `feed`
    // view — it doesn't carry author_full_name/avatar/verified or score.
    // Merging that wholesale would blank those fields out of the card,
    // so only the content itself is updated locally.
    await PostsAPI.update(postId, { content });
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, content } : p)));
  }

  async function handleDeletePost(postId) {
    try {
      await PostsAPI.softDelete(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      setError(err.message || "That post wasn't deleted. Try again.");
    }
  }

  function handleCommentCountChange(postId, delta) {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + delta } : p))
    );
  }

  return (
    <div
      className="screen"
      ref={scrollRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      <div
        className="pull-refresh-indicator"
        style={{ height: refreshing ? 40 : pullDistance }}
      >
        {refreshing ? 'Refreshing…' : pullDistance >= PULL_THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}
      </div>

      {newPostsAvailable && !refreshing && (
        <button type="button" className="new-posts-pill" onClick={handleNewPostsClick}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          New posts
        </button>
      )}

      <header className="feed-header">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('campusmeet:refresh-feed'))}
          aria-label="Refresh feed"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}
        >
          <img src={campmeetLogo} alt="" style={{ width: 34, height: 34, borderRadius: 8 }} />
          <span className="h-display" style={{ fontSize: 'var(--fs-lg)', color: 'var(--maroon-deep)' }}>CampusMEET</span>
        </button>

        {user?.role === 'admin' && (
          <button type="button" className="admin-pill" onClick={() => navigate('/admin')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2l7 3v6c0 5-3 8.5-7 11-4-2.5-7-6-7-11V5l7-3z" fill="var(--gold)" />
            </svg>
            Admin
          </button>
        )}
      </header>

      {/* Campus/National scope toggle — the actual multi-university
          architecture decision made visible: defaults to your own
          campus so a new university's feed doesn't open into a wall
          of strangers from wherever onboarded first. */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 'var(--sp-3)', overflowX: 'auto', flexWrap: 'nowrap', WebkitOverflowScrolling: 'touch' }}>
        {[
          { key: 'campus', label: 'My Campus' },
          { key: 'national', label: 'All' },
        ].map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setScope(opt.key)}
            style={{
              padding: '5px 14px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600,
              border: scope === opt.key ? 'none' : '1px solid var(--line)',
              background: scope === opt.key ? 'var(--maroon)' : 'transparent',
              color: scope === opt.key ? '#fff' : 'var(--ink-soft)',
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        ))}

        {/* Moved down from the header row, which was cramming logo +
            brand name + admin pill + these 4 icons into one line and
            overflowing on narrow phone screens. Living here means they
            share the scope toggle's existing horizontal-scroll safety
            net instead of needing their own. */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => navigate('/groups')}
            aria-label="Groups"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <circle cx="8" cy="9" r="3" stroke="var(--ink)" strokeWidth="2" />
              <circle cx="17" cy="9" r="3" stroke="var(--ink)" strokeWidth="2" />
              <path d="M2.5 20c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
              <path d="M11.5 20c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => navigate('/events')}
            aria-label="Events"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="16" rx="2" stroke="var(--ink)" strokeWidth="2" />
              <path d="M3 10h18" stroke="var(--ink)" strokeWidth="2" />
              <path d="M8 3v4M16 3v4" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => navigate('/campusmeet-hq')}
            aria-label="CampusMEET HQ"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <path d="M12 2l7 3v6c0 5-3 8.5-7 11-4-2.5-7-6-7-11V5l7-3z" fill="var(--gold-bright)" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => navigate('/search')}
            aria-label="Search"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="10.5" cy="10.5" r="6.5" stroke="var(--ink)" strokeWidth="2" />
              <path d="M20 20l-4.35-4.35" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <StatusStrip />

      {/* Facebook/IG-style quick composer — tapping it (not typing here
          directly) jumps to the full post screen, which already handles
          image attachments etc. This is just the entry point. */}
      <button
        type="button"
        onClick={() => navigate('/create')}
        className="card"
        style={{
          display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', width: '100%',
          border: 'none', cursor: 'pointer', textAlign: 'left', marginBottom: 'var(--sp-4)',
        }}
      >
        <div className="avatar-circle" style={{ width: 36, height: 36, fontSize: '0.9rem', flexShrink: 0 }}>
          {user?.avatar_url ? <img src={user.avatar_url} alt="" /> : (user?.full_name ? user.full_name.charAt(0) : '?')}
        </div>
        <span style={{ color: 'var(--ink-soft)', fontSize: 'var(--fs-sm)' }}>What's happening on campus?</span>
      </button>

      {error && <div className="banner-error">{error}</div>}

      {loading ? (
        <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
      ) : posts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-soft)' }}>No posts yet. Be the first to share something.</p>
        </div>
      ) : (
        <>
          {posts.map((post, index) => (
            <Fragment key={post.id}>
              <PostCard
                post={post}
                onReact={handleReact}
                onEditSave={handleEditSave}
                onDeletePost={handleDeletePost}
                onShowReactors={setReactorsPostId}
                onShowComments={setCommentsPostId}
              />
              {/* After the 3rd post — early enough that new users actually
                  see it, not buried past a scroll they might not make. */}
              {index === 2 && <SuggestedPeople />}
            </Fragment>
          ))}
          <div ref={sentinelRef} className="infinite-scroll-sentinel" />
          {loadingMore && <p style={{ textAlign: 'center', color: 'var(--ink-soft)' }}>Loading more…</p>}
          {!hasMore && <p className="feed-end-note">You're all caught up.</p>}
        </>
      )}

      {reactorsPostId && (
        <ReactorsModal postId={reactorsPostId} onClose={() => setReactorsPostId(null)} />
      )}
      {commentsPostId && (
        <CommentsSheet
          postId={commentsPostId}
          onClose={() => setCommentsPostId(null)}
          onCommentCountChange={(delta) => handleCommentCountChange(commentsPostId, delta)}
        />
      )}
    </div>
  );
}
