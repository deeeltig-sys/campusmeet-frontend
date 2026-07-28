import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import VerifiedBadge from './VerifiedBadge';
import ReportModal from './ReportModal';
import { REACTION_TYPES, PostsAPI, StatusesAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ReactionIcon, CommentIcon } from './icons';
import FullscreenImageViewer from './FullscreenImageViewer';
import RepostModal from './RepostModal';

// Reaction buttons use plain emoji, not the custom line-icon SVGs from
// icons.jsx — only these 4 buttons.
const REACTIONS = [
  { type: 'fire', emoji: '🔥', label: 'Fire' },
  { type: 'cosign', emoji: '🤝', label: 'Cosign' },
  { type: 'doubt', emoji: '👎', label: 'Doubt' },
  { type: 'yawa', emoji: '🚫', label: 'Yawa' },
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
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [sharingToStatus, setSharingToStatus] = useState(false);
  const menuRef = useRef(null);

  const isRepost = !!post.repost_of;
  // Reposting a repost reposts the ORIGINAL, not the repost-of-a-repost
  // — same behavior as X, so a chain never gets more than one link deep.
  const repostTarget = isRepost ? (post.original_post || { id: post.repost_of }) : post;

  useEffect(() => {
    if (!showMenu) return;
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

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

  async function handleShareToStatus() {
    setShowMenu(false);
    if (sharingToStatus) return;
    setSharingToStatus(true);
    try {
      // Any post's image can be reshared to Status by anyone, own or
      // not — this is explicitly meant to work like sharing someone
      // else's post to your story on IG. Text-only posts share as a
      // text status instead, capped to the 280-char status limit.
      if (displayImage) {
        await StatusesAPI.create({ content_type: 'image', image_url: displayImage });
      } else if (displayContent) {
        await StatusesAPI.create({
          content_type: 'text',
          text_content: displayContent.slice(0, 280),
          background_color: '#7a2436',
        });
      }
      window.dispatchEvent(new CustomEvent('campusmeet:status-posted'));
    } catch {
      // Sharing to status failing silently is preferable to a jarring
      // error over what's meant to be a lightweight, low-friction action.
    } finally {
      setSharingToStatus(false);
    }
  }

  function renderReactionBar() {
    return (
      <div className="reaction-bar" role="group" aria-label="React to this post">
        {REACTIONS.map(({ type, emoji, label }) => {
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
            >
              <span className="reaction-emoji" aria-hidden="true">{emoji}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Pure repost (no added commentary): the header/body show the
  // ORIGINAL author's content, exactly like X's plain Repost — only
  // the small banner above identifies who reposted it. A quote-repost
  // (commentary added) instead shows the REPOSTER as the normal
  // author, with the original embedded as a nested card below —
  // same distinction X draws between Repost and Quote.
  const isPureRepost = isRepost && !content;
  const displayAuthor = isPureRepost
    ? (post.original_post
        ? { full_name: post.original_post.author_full_name, avatar_url: post.original_post.author_avatar_url, verified: post.original_post.author_verified }
        : null)
    : author;
  const displayContent = isPureRepost ? post.original_post?.content : content;
  const displayImage = isPureRepost ? post.original_post?.image_url : post.image_url;
  const displayAuthorId = isPureRepost ? post.repost_of : post.author_id;

  return (
    <article className="card post-card">
      {isRepost && (
        <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--ink-soft)', marginBottom: 'var(--sp-2)', fontWeight: 600 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7 7h9a3 3 0 013 3v2M17 17H8a3 3 0 01-3-3v-2" stroke="var(--ink-soft)" strokeWidth="2" strokeLinecap="round" />
            <path d="M4 9l3-3 3 3M20 15l-3 3-3-3" stroke="var(--ink-soft)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {author.full_name || 'Someone'} reposted
        </p>
      )}

      {isPureRepost && !post.original_post ? (
        <p style={{ color: 'var(--ink-soft)', fontSize: 'var(--fs-sm)', fontStyle: 'italic' }}>This post is no longer available.</p>
      ) : (
        <>
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
        <Link to={`/profile/${displayAuthorId}`} className="avatar-circle">
          {displayAuthor?.avatar_url ? (
            <img src={displayAuthor.avatar_url} alt="" />
          ) : (
            displayAuthor?.full_name ? displayAuthor.full_name.charAt(0) : '?'
          )}
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Link to={`/profile/${displayAuthorId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <strong style={{ fontSize: 'var(--fs-sm)' }}>{displayAuthor?.full_name || 'Student'}</strong>
            </Link>
            <VerifiedBadge verified={displayAuthor?.verified} size={15} />
          </div>
          {created_at && (
            <time style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--ink-soft)' }}>
              {new Date(created_at).toLocaleString()}
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
              <button type="button" className="post-menu-item" onClick={handleShareToStatus} disabled={sharingToStatus}>
                {sharingToStatus ? 'Sharing…' : 'Share to Status'}
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
        <p style={{ margin: 0, fontSize: 'var(--fs-base)', lineHeight: 1.55 }}>{displayContent}</p>
      )}

      {displayImage && (
        <button
          type="button"
          className="post-image-wrap"
          onClick={() => setShowFullscreen(true)}
          style={{ border: 'none', padding: 0, cursor: 'zoom-in', width: '100%', display: 'block' }}
        >
          <img className="post-image" src={displayImage} alt="" loading="lazy" />
        </button>
      )}

      {/* Quote-repost — reposter's own commentary above, original
          embedded here as a nested mini-card, same as X's Quote Tweet. */}
      {isRepost && !isPureRepost && (
        post.original_post ? (
          <Link
            to={`/post/${post.repost_of}`}
            className="card"
            style={{ display: 'block', marginTop: 'var(--sp-3)', textDecoration: 'none', color: 'inherit', border: '1px solid var(--line)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <strong style={{ fontSize: 'var(--fs-xs)' }}>{post.original_post.author_full_name || 'Student'}</strong>
              <VerifiedBadge verified={post.original_post.author_verified} size={12} />
            </div>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
              {post.original_post.content}
            </p>
            {post.original_post.image_url && (
              <img src={post.original_post.image_url} alt="" style={{ width: '100%', borderRadius: 8, marginTop: 6, maxHeight: 180, objectFit: 'cover' }} />
            )}
          </Link>
        ) : (
          <p style={{ marginTop: 'var(--sp-3)', color: 'var(--ink-soft)', fontSize: 'var(--fs-xs)', fontStyle: 'italic' }}>
            The reposted post is no longer available.
          </p>
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
            onClick={() => setShowRepostModal(true)}
            aria-label="Repost"
            title="Repost"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M7 7h9a3 3 0 013 3v2M17 17H8a3 3 0 01-3-3v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M4 9l3-3 3 3M20 15l-3 3-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </footer>

      {showFullscreen && displayImage && (
        <FullscreenImageViewer
          imageUrl={displayImage}
          caption={displayContent}
          reactionBar={renderReactionBar()}
          onClose={() => setShowFullscreen(false)}
        />
      )}

      {showReport && (
        <ReportModal targetType="post" targetId={post.id} onClose={() => setShowReport(false)} />
      )}

      {showRepostModal && (
        <RepostModal
          post={{ id: repostTarget.id, content: repostTarget.content || repostTarget.original_post?.content, author_full_name: repostTarget.author_full_name || displayAuthor?.full_name }}
          onClose={() => setShowRepostModal(false)}
          onReposted={() => window.dispatchEvent(new CustomEvent('campusmeet:refresh-feed'))}
        />
      )}
    </article>
  );
}
