import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PostsAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="screen">
      <header className="feed-header">
        <div>
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
