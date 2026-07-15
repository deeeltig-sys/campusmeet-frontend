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

  async function handleReact(postId) {
    // optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, user_reacted: !p.user_reacted, reaction_count: p.reaction_count + (p.user_reacted ? -1 : 1) }
          : p
      )
    );
    try {
      const post = posts.find((p) => p.id === postId);
      if (post?.user_reacted) {
        await PostsAPI.unreact(postId);
      } else {
        await PostsAPI.react(postId, 'fire'); // one-tap default reaction
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
