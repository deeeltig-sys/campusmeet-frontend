import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PostsAPI } from '../api/client';

/**
 * The grid of a person's own posts on their profile — this is what was
 * genuinely missing before (profiles showed follower counts and a bio,
 * but never the person's actual posts), which is a big part of why the
 * app read as a corporate directory rather than a social platform.
 *
 * mode="posts" (default) — this person's own posts, requires userId.
 * mode="saved" — the CALLER's bookmarked posts (only ever their own —
 * there's no "view someone else's saved posts", same as IG/X).
 * collectionId (optional, mode="saved" only) — narrows to one saved
 * collection instead of everything the caller has ever bookmarked.
 */
export default function PostGrid({ userId, mode = 'posts', collectionId }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (mode === 'posts' && !userId) return;
    let cancelled = false;
    setLoading(true);
    const fetcher = mode === 'saved' ? PostsAPI.saved(collectionId) : PostsAPI.byUser(userId);
    fetcher
      .then((data) => { if (!cancelled) setPosts(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setPosts([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, mode, collectionId]);

  if (loading) {
    return <p style={{ color: 'var(--ink-soft)', fontSize: 'var(--fs-sm)', textAlign: 'center', marginTop: 'var(--sp-4)' }}>Loading posts…</p>;
  }
  if (posts.length === 0) {
    return (
      <p style={{ color: 'var(--ink-soft)', fontSize: 'var(--fs-sm)', textAlign: 'center', marginTop: 'var(--sp-4)' }}>
        {mode === 'saved' ? 'Nothing saved yet.' : 'No posts yet.'}
      </p>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
      {posts.map((post) => (
        <button
          key={post.id}
          type="button"
          onClick={() => navigate(`/post/${post.id}`)}
          style={{
            aspectRatio: '1 / 1', border: 'none', padding: 0, cursor: 'pointer',
            background: post.image_url ? `center / cover no-repeat url(${post.image_url})` : 'var(--maroon-light)',
            position: 'relative', overflow: 'hidden',
          }}
        >
          {!post.image_url && (
            <span style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 8, fontSize: '0.6875rem', color: 'var(--maroon-deep)', textAlign: 'center',
              overflow: 'hidden', lineHeight: 1.3,
            }}>
              {(post.content || '').slice(0, 60)}
            </span>
          )}
          {/* Reaction count overlay — bottom-right corner, appears on every
              tile so scanning the grid also shows what's resonating. */}
          <span style={{
            position: 'absolute', bottom: 4, right: 4, fontSize: '0.625rem', fontWeight: 600,
            color: '#fff', background: 'rgba(0,0,0,0.45)', borderRadius: 8, padding: '1px 6px',
          }}>
            🔥 {post.reaction_count || 0}
          </span>
        </button>
      ))}
    </div>
  );
}
