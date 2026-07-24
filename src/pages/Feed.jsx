import { useEffect, useState, useCallback, useRef, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { PostsAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import SuggestedPeople from '../components/SuggestedPeople';
import ReactorsModal from '../components/ReactorsModal';
import CommentsSheet from '../components/CommentsSheet';
import campmeetLogo from '../assets/campmeet-logo.png';

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

  const { user } = useAuth();
  const navigate = useNavigate();

  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);
  const touchStartY = useRef(null);
  const [pullDistance, setPullDistance] = useState(0);

  // ---- Initial load ----
  const load = useCallback(async () => {
    setError('');
    try {
      const data = await PostsAPI.feed(PAGE_SIZE, 0);
      const list = Array.isArray(data) ? data : data?.posts || [];
      setPosts(list);
      setOffset(list.length);
      setHasMore(list.length === PAGE_SIZE);
    } catch (err) {
      setError(err.message || 'Could not load the feed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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
      const data = await PostsAPI.feed(PAGE_SIZE, 0);
      const list = Array.isArray(data) ? data : data?.posts || [];
      setPosts(list);
      setOffset(list.length);
      setHasMore(list.length === PAGE_SIZE);
    } catch (err) {
      setError(err.message || 'Could not refresh the feed.');
    } finally {
      setRefreshing(false);
      setPullDistance(0);
    }
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

  // ---- Infinite scroll ----
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || refreshing) return;
    setLoadingMore(true);
    try {
      const data = await PostsAPI.feed(PAGE_SIZE, offset);
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
  }, [offset, hasMore, loadingMore, refreshing]);

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
      setError(err.message || 'Could not delete that post.');
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
    >
      <div
        className="pull-refresh-indicator"
        style={{ height: refreshing ? 40 : pullDistance }}
      >
        {refreshing ? 'Refreshing…' : pullDistance >= PULL_THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}
      </div>

      <header className="feed-header">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('campusmeet:refresh-feed'))}
          aria-label="Refresh feed"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}
        >
          <img src={campmeetLogo} alt="" style={{ width: 34, height: 34, borderRadius: 8 }} />
        </button>
        <div style={{ flex: 1 }}>
          <p className="eyebrow">The Feed</p>
          <h1 className="h-display" style={{ fontSize: 'var(--fs-xl)' }}>What's happening on campus</h1>
        </div>

        {user?.role === 'admin' && (
          <button type="button" className="admin-pill" onClick={() => navigate('/admin')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2l7 3v6c0 5-3 8.5-7 11-4-2.5-7-6-7-11V5l7-3z" fill="var(--gold)" />
            </svg>
            Admin
          </button>
        )}
      </header>

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
