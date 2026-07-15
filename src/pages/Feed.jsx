import { useEffect, useState, useCallback } from 'react';
import { PostsAPI } from '../api/client';
import PostCard from '../components/PostCard';

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await PostsAPI.feed();
      setPosts(Array.isArray(data) ? data : data?.posts || []);
    } catch (err) {
      setError(err.message || 'Could not load the feed.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleReact(postId, type) {
    const current = posts.find((p) => p.id === postId);
    if (!current) return;

    const wasSame = current.user_reaction === type;
    const hadAny = current.user_reaction != null;

    // Tapping the active reaction again clears it. Tapping a different one
    // switches (one live reaction per person per post, per the backend's
    // unique constraint) — the total count only moves when a reaction is
    // added or cleared, not when it switches type.
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
      load(); // resync on failure
    }
  }

  return (
    <div className="screen">
      <header style={{ marginBottom: 'var(--sp-5)' }}>
        <p className="eyebrow">The Feed</p>
        <h1 className="h-display" style={{ fontSize: 'var(--fs-xl)' }}>What's happening on campus</h1>
      </header>

      {error && <div className="banner-error">{error}</div>}

      {loading ? (
        <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
      ) : posts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-soft)' }}>No posts yet. Be the first to share something.</p>
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} onReact={handleReact} />)
      )}
    </div>
  );
}
