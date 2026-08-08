import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import VerifiedBadge from './VerifiedBadge';
import ReportModal from './ReportModal';
import { REACTION_TYPES, PostsAPI, SITE_URL } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ReactionIcon, CommentIcon, ShareIcon, REACTION_EMOJI } from './icons';
import FullscreenImageViewer from './FullscreenImageViewer';
import HashtagText from './HashtagText';
import PollBlock from './PollBlock';
import PostImageCarousel from './PostImageCarousel';

// Reaction buttons — real emoji, matching how they render on every
// actual post (see franklin.png). The line-art REACTION_ICONS set in
// ./icons is kept for other spots (count chips, admin stats) but the
// reaction buttons themselves are emoji, full stop.
const REACTIONS = [
  { type: 'fire', label: 'Fire' },
  { type: 'cosign', label: 'Cosign' },
  { type: 'doubt', label: 'Doubt' },
  { type: 'yawa', label: 'Yawa' },
];

export default function PostCard({ post, onReact, onEditSave, onDeletePost, onShowReactors, onShowComments }) {
  const { user } = useAuth();

  const { content, created_at, reaction_count = 0, comment_count = 0, user_reaction } = post;

  const author = post.author || {
    full_name: post.author_full_name,
    verified: post.author_verified_at != null || post.author_verified,
    avatar_url: post.author_avatar_url,
  };

  const isOwn = user?.id === post.author_id;
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(content);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [saved, setSaved] = useState(!!post.saved);
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [fullscreenUrl, setFullscreenUrl] = useState(null);
  const [justShared, setJustShared] = useState(false);
  const menuRef = useRef(null);

  // /p/:postId, not /post/:postId — the public unauthenticated preview
  // route, not the in-app one. See PublicPostView.jsx / App.jsx.
  async function handleShare() {
    const url = `${SITE_URL}/p/${post.id}`;
    const shareData = {
      title: 'CampusMEET',
      text: author.full_name ? `${author.full_name} on CampusMEET` : 'Check this out on CampusMEET',
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User backed out of the native share sheet — not an error worth surfacing.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setJustShared(true);
      setTimeout(() => setJustShared(false), 2000);
    } catch {
      // Clipboard API unavailable/blocked — nothing more we can do silently.
    }
  }
  const cardRef = useRef(null);
  const hasRegisteredView = useRef(false);

  useEffect(() => {
    if (!showMenu) return;
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  // View tracking — this was previously never wired up anywhere at
  // all: PostsAPI.registerView existed in the API client but no
  // component ever called it, so view_count could never move past 0
  // no matter how much a post was actually seen. Fires once per post
  // per mount, the first time at least half the card has been
  // visible for a beat (not just flickered past while scrolling fast).
  useEffect(() => {
    if (!post?.id || !cardRef.current) return;
    hasRegisteredView.current = false;

    const el = cardRef.current;
    let dwellTimer = null;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !hasRegisteredView.current) {
          dwellTimer = setTimeout(() => {
            if (hasRegisteredView.current) return;
            hasRegisteredView.current = true;
            PostsAPI.registerView(post.id).catch(() => {
              // Not worth surfacing to the person scrolling — a missed
              // view count is a metrics gap, not something they need
              // to know about or retry.
            });
            observer.disconnect();
          }, 800);
        } else if (!entry.isIntersecting && dwellTimer) {
          clearTimeout(dwellTimer);
          dwellTimer = null;
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => {
      if (dwellTimer) clearTimeout(dwellTimer);
      observer.disconnect();
    };
  }, [post?.id]);

  function startEdit() {
    setEditDraft(content);
    setEditError('');
    setIsEditing(true);
    setShowMenu(false);
  }

  async function saveEdit() {
    const trimmed = editDraft.trim();
    if (!trimmed) {
      setEditError('Post cannot be empty.');
      return;
    }
    setSaving(true);
    setEditError('');
    try {
      await onEditSave?.(post.id, trimmed);
      setIsEditing(false);
    } catch (err) {
      setEditError(err.message || 'Could not save your edit.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    setShowMenu(false);
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    onDeletePost?.(post.id);
  }

  async function handleToggleSave() {
    setShowMenu(false);
    if (savingBookmark) return;
    const next = !saved;
    setSaved(next); // optimistic
    setSavingBookmark(true);
    try {
      next ? await PostsAPI.save(post.id) : await PostsAPI.unsave(post.id);
    } catch {
      setSaved(!next); // revert on failure
    } finally {
      setSavingBookmark(false);
    }
  }

  function renderReactionBar() {
    return (
      <div className="reaction-bar" role="group" aria-label="React to this post">
        {REACTIONS.map(({ type, label }) => {
          const active = user_reaction === type;
          return (
            <button
              key={type}
              type="button"
              className={`reaction-btn${active ? ' active' : ''}`}
              aria-pressed={active}
              aria-label={active ? `${label} (your reaction)` : label}
              title={label}
              onClick={() => onReact?.(post.id, type)}
              disabled={!REACTION_TYPES.includes(type)}
              style={{ fontSize: '19px', lineHeight: 1 }}
            >
              {REACTION_EMOJI[type]}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <article ref={cardRef} className="card post-card">
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
        <Link to={`/profile/${post.author_id}`} className="avatar-circle">
          {author.avatar_url ? (
            <img src={author.avatar_url} alt="" />
          ) : (
            author.full_name ? author.full_name.charAt(0) : '?'
          )}
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Link to={`/profile/${post.author_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <strong className="name-shine" style={{ fontSize: 'var(--fs-sm)' }}>{author.full_name || 'Student'}</strong>
            </Link>
            <VerifiedBadge verified={author.verified} size={15} />
          </div>
          {created_at && (
            <time style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--ink-soft)' }}>
              {new Date(created_at).toLocaleString()}
              {post.audience === 'friends' && (
                <span title="Friends only" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M9 12a3 3 0 100-6 3 3 0 000 6zM3 20c0-3 2.5-5.5 6-5.5s6 2.5 6 5.5M16 8a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM14.5 14c2.8.4 5.5 2.4 5.5 6" stroke="var(--ink-soft)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
              {isOwn && typeof post.view_count === 'number' && (
                <span style={{ color: 'var(--ink-soft)' }}>· {post.view_count} {post.view_count === 1 ? 'view' : 'views'}</span>
              )}
            </time>
          )}
        </div>

        {/* Overflow menu — every utility action (edit/delete/report/save)
            lives behind this one button instead of a row of separate
            links, matching how X/IG/FB keep the card itself clean. */}
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            type="button"
            className="post-menu-trigger"
            aria-label="Post options"
            onClick={() => setShowMenu((v) => !v)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="5" cy="12" r="1.6" fill="var(--ink-soft)" />
              <circle cx="12" cy="12" r="1.6" fill="var(--ink-soft)" />
              <circle cx="19" cy="12" r="1.6" fill="var(--ink-soft)" />
            </svg>
          </button>
          {showMenu && (
            <div className="card" style={{ position: 'absolute', top: '100%', right: 0, zIndex: 15, minWidth: 170, padding: 6 }}>
              <button type="button" className="post-menu-item" onClick={handleToggleSave}>
                {saved ? 'Unsave' : 'Save'}
              </button>
              {isOwn ? (
                <>
                  <button type="button" className="post-menu-item" onClick={startEdit}>Edit</button>
                  <button type="button" className="post-menu-item danger" onClick={handleDelete}>Delete</button>
                </>
              ) : (
                <button type="button" className="post-menu-item danger" onClick={() => { setShowMenu(false); setShowReport(true); }}>
                  Report
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {isEditing ? (
        <>
          <textarea
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            rows={4}
            maxLength={2000}
            style={{
              width: '100%', fontFamily: 'var(--font-body)', fontSize: 'var(--fs-base)',
              borderRadius: 'var(--radius-md)', border: '1px solid var(--line)', padding: 'var(--sp-3)',
              resize: 'vertical',
            }}
          />
          {editError && <div className="banner-error" style={{ marginTop: 'var(--sp-2)' }}>{editError}</div>}
          <div className="post-actions">
            <button type="button" className="post-action-link" onClick={saveEdit} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" className="post-action-link" onClick={() => setIsEditing(false)} disabled={saving}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <p style={{ margin: 0, fontSize: 'var(--fs-base)', lineHeight: 1.55 }}>
          <HashtagText text={content} mentions={post.mentions} />
        </p>
      )}

      {post.poll && <PollBlock post={post} />}

      {post.images && post.images.length > 1 ? (
        <PostImageCarousel images={post.images} onImageTap={setFullscreenUrl} />
      ) : (
        post.image_url && (
          <button
            type="button"
            className="post-image-wrap"
            onClick={() => setFullscreenUrl(post.image_url)}
            style={{ border: 'none', padding: 0, cursor: 'zoom-in', width: '100%', display: 'block' }}
          >
            <img className="post-image" src={post.image_url} alt="" loading="lazy" />
          </button>
        )
      )}

      <footer className="reaction-footer">
        {renderReactionBar()}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          <button
            type="button"
            className="reaction-count-btn"
            onClick={() => onShowReactors?.(post.id)}
            disabled={reaction_count === 0}
          >
            <ReactionIcon size={15} /> {reaction_count}
          </button>
          <button
            type="button"
            className="reaction-count-btn"
            onClick={() => onShowComments?.(post.id)}
          >
            <CommentIcon size={15} /> {comment_count}
          </button>
          <button
            type="button"
            className="reaction-count-btn"
            onClick={handleShare}
            title="Share this post"
          >
            <ShareIcon size={15} /> {justShared ? 'Copied!' : 'Share'}
          </button>
        </div>
      </footer>

      {fullscreenUrl && (
        <FullscreenImageViewer
          imageUrl={fullscreenUrl}
          caption={content}
          reactionBar={renderReactionBar()}
          onClose={() => setFullscreenUrl(null)}
        />
      )}

      {showReport && (
        <ReportModal targetType="post" targetId={post.id} onClose={() => setShowReport(false)} />
      )}
    </article>
  );
}
