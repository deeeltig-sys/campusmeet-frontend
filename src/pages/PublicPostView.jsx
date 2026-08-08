import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PublicAPI } from '../api/client';
import PostCard from '../components/PostCard';
import campmeetLogo from '../assets/campmeet-logo.png';

/**
 * The landing spot for a shared post link (WhatsApp/FB/IG/X) tapped by
 * someone with no CampusMEET account. Deliberately NOT wrapped in
 * ProtectedLayout — that's what used to hard-redirect every shared link
 * straight to a bare /login screen with zero context. This shows the
 * real post (full content, per the call to show everything rather than
 * lock it behind a paywall-style blur) and keeps a persistent signup
 * bar in view the whole time, rather than a one-time dismissible modal.
 *
 * Any action that actually requires an account (react, comment, view
 * who reacted) routes to signup instead of erroring — see the stub
 * handlers passed to PostCard below.
 */
export default function PublicPostView() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    PublicAPI.getPost(postId)
      .then((data) => {
        if (cancelled) return;
        // PostCard reads `post.images` (array) for its carousel; the
        // public API returns `image_urls` to keep the wire shape
        // explicit about what it is. Map once here rather than
        // changing PostCard's expectations for every other caller.
        setPost({ ...data, images: data.image_urls });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.status === 404
          ? "This post isn't available — it may have been removed, or it's a friends-only post you'd need to be signed in to see."
          : 'Could not load this post.');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [postId]);

  const goSignup = () => navigate(`/signup?next=/post/${postId}`);

  return (
    <div className="screen public-post-screen">
      <div className="public-post-topbar">
        <Link to="/onboarding" className="public-post-brand">
          <img src={campmeetLogo} alt="" width={28} height={28} />
          <span>CampusMEET</span>
        </Link>
        <button className="btn btn-primary btn-sm" onClick={goSignup}>Sign up</button>
      </div>

      <div className="public-post-body">
        {loading && <div style={{ padding: 'var(--sp-6)', textAlign: 'center' }}>Loading…</div>}
        {!loading && error && (
          <div style={{ padding: 'var(--sp-6)', textAlign: 'center', color: 'var(--ink-soft)' }}>{error}</div>
        )}
        {!loading && post && (
          <PostCard
            post={post}
            onReact={goSignup}
            onShowReactors={goSignup}
            onShowComments={goSignup}
          />
        )}
      </div>

      {/* Persistent, not a one-time dismissible modal — stays in view
          the whole time someone reads the post, per the "prompt exists
          to force" requirement, without blocking the content itself. */}
      <div className="public-post-cta-bar">
        <span>Join CampusMEET to react, comment, and connect with your campus.</span>
        <button className="btn btn-primary btn-sm" onClick={goSignup}>Sign up free</button>
      </div>
    </div>
  );
}
