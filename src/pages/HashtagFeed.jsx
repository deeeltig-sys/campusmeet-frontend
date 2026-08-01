import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { HashtagsAPI, PostsAPI } from '../api/client';
import PostCard from '../components/PostCard';
import BackHeader from '../components/BackHeader';

export default function HashtagFeed() {
  const { tag } = useParams();
  const [posts, setPosts] = useState([]);
  const [postCount, setPostCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await HashtagsAPI.posts(tag);
      setPosts(Array.isArray(data?.posts) ? data.posts : []);
      setPostCount(data?.post_count || 0);
    } catch (err) {
      setError(err.message || 'Could not load this tag.');
    } finally {
      setLoading(false);
    }
  }, [tag]);

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
      <BackHeader fallback="/search" eyebrow="Hashtag" title={`#${tag}`} />

      {!loading && (
        <p style={{ color: 'var(--ink-soft)', fontSize: 'var(--fs-sm)', marginTop: '-8px', marginBottom: 'var(--sp-4)' }}>
          {postCount} {postCount === 1 ? 'post' : 'posts'}
        </p>
      )}

      {error && <div className="banner-error">{error}</div>}
      {loading && <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>}

      {!loading && !error && posts.length === 0 && (
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-soft)' }}>No posts tagged #{tag} yet.</p>
        </div>
      )}

      {!loading && posts.map((post) => (
        <PostCard key={post.id} post={post} onReact={handleReact} />
      ))}
    </div>
  );
}
