import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import VerifiedBadge from './VerifiedBadge';
import ReportModal from './ReportModal';
import { REACTION_TYPES, PostsAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ReactionIcon, CommentIcon } from './icons';
import FullscreenImageViewer from './FullscreenImageViewer';
import HashtagText from './HashtagText';

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
  const menuRef = useRef(null);

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

  return (
    <article className="card post-card">
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
              <strong style={{ fontSize: 'var(--fs-sm)' }}>{author.full_name || 'Student'}</strong>
            </Link>
            <VerifiedBadge verified={author.verified} size={15} />
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
          <HashtagText text={content} />
        </p>
      )}

      {post.image_url && (
        <button
          type="button"
          className="post-image-wrap"
          onClick={() => setShowFullscreen(true)}
          style={{ border: 'none', padding: 0, cursor: 'zoom-in', width: '100%', display: 'block' }}
        >
          <img className="post-image" src={post.image_url} alt="" loading="lazy" />
        </button>
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
        </div>
      </footer>

      {showFullscreen && post.image_url && (
        <FullscreenImageViewer
          imageUrl={post.image_url}
          caption={content}
          reactionBar={renderReactionBar()}
          onClose={() => setShowFullscreen(false)}
        />
      )}

      {showReport && (
        <ReportModal targetType="post" targetId={post.id} onClose={() => setShowReport(false)} />
      )}
    </article>
  );
}
