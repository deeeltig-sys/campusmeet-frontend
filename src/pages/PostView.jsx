import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PostsAPI } from '../api/client';
import PostCard from '../components/PostCard';
import ReactorsModal from '../components/ReactorsModal';
import CommentsSheet from '../components/CommentsSheet';
import BackHeader from '../components/BackHeader';

/**
 * Deep-link target for a single post — this didn't exist before, which
 * meant PostGrid's tap-to-view and comment/reaction notification taps
 * both had nowhere real to go. Feed.jsx can't serve this role itself:
 * it's paginated and randomly ordered on every load, so "the post from
 * this notification" might not even be in whatever page loaded — a
 * dedicated fetch-by-id view is the only reliable way to land on one
 * specific post regardless of feed state.
 */
export default function PostView() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showReactors, setShowReactors] = useState(false);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError('');
    PostsAPI.get(postId)
      .then((data) => setPost(data))
      .catch((err) => setError(err.message || 'This post is no longer available.'))
      .finally(() => setLoading(false));
  }, [postId]);

  async function handleReact(id, type) {
    if (!post) return;
    const wasSame = post.user_reaction === type;
    const hadAny = post.user_reaction != null;
    const nextReaction = wasSame ? null : type;
    const countDelta = wasSame ? -1 : hadAny ? 0 : 1;

    setPost((p) => ({ ...p, user_reaction: nextReaction, reaction_count: p.reaction_count + countDelta }));
    try {
      wasSame ? await PostsAPI.unreact(id) : await PostsAPI.react(id, type);
    } catch {
      PostsAPI.get(postId).then(setPost).catch(() => {});
    }
  }

  async function handleEditSave(id, content) {
    await PostsAPI.update(id, { content });
    setPost((p) => ({ ...p, content }));
  }

  async function handleDeletePost(id) {
    try {
      await PostsAPI.softDelete(id);
      navigate('/feed');
    } catch (err) {
      setError(err.message || 'Could not delete that post.');
    }
  }

  return (
    <div className="screen">
      <BackHeader fallback="/feed" title="Post" />

      {loading && <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>}
      {error && <div className="banner-error">{error}</div>}

      {!loading && post && (
        <PostCard
          post={post}
          onReact={handleReact}
          onEditSave={handleEditSave}
          onDeletePost={handleDeletePost}
          onShowReactors={() => setShowReactors(true)}
          onShowComments={() => setShowComments(true)}
        />
      )}

      {showReactors && <ReactorsModal postId={postId} onClose={() => setShowReactors(false)} />}
      {showComments && (
        <CommentsSheet
          postId={postId}
          onClose={() => setShowComments(false)}
          onCommentCountChange={(delta) => setPost((p) => ({ ...p, comment_count: (p.comment_count || 0) + delta }))}
        />
      )}
    </div>
  );
}
