import { useState } from 'react';
import VerifiedBadge from './VerifiedBadge';
import { REACTION_TYPES } from '../api/client';
import { useAuth } from '../context/AuthContext';

const REACTIONS = [
  { type: 'fire', emoji: '🔥', label: 'Fire' },
  { type: 'cosign', emoji: '🤝', label: 'Cosign' },
  { type: 'doubt', emoji: '👎', label: 'Doubt' },
  { type: 'yawa', emoji: '🚫', label: 'Yawa' },
];

export default function PostCard({ post, onReact, onEditSave, onDeletePost, onShowReactors, onShowComments }) {
  const { user } = useAuth();

  // reaction_count is the aggregate across all four types — fire, cosign,
  // doubt and yawa all count the same toward it and toward feed ranking.
  // There's no separate suppressed or "contested" state for high-yawa posts;
  // a post's reach doesn't change because of which reaction it's getting.
  const { content, created_at, reaction_count = 0, comment_count = 0, user_reaction } = post;

  // public_post_fields() only returns author_id (no nested author object), so the
  // `feed` DB view is what would actually join in name/verified — its exact column
  // names aren't confirmed here. This handles the two most likely shapes: a nested
  // `author` object, or flattened `author_full_name` / `author_verified_at` columns.
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

  function startEdit() {
    setEditDraft(content);
    setEditError('');
    setIsEditing(true);
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
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    onDeletePost?.(post.id);
  }

  return (
    <article className="card post-card">
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
        <div className="avatar-circle">
          {author.avatar_url ? (
            <img src={author.avatar_url} alt="" />
          ) : (
            author.full_name ? author.full_name.charAt(0) : '?'
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <strong style={{ fontSize: 'var(--fs-sm)' }}>{author.full_name || 'Student'}</strong>
            <VerifiedBadge verified={author.verified} size={15} />
          </div>
          {created_at && (
            <time style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--ink-soft)' }}>
              {new Date(created_at).toLocaleString()}
            </time>
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
        <p style={{ margin: 0, fontSize: 'var(--fs-base)', lineHeight: 1.55 }}>{content}</p>
      )}

      {post.image_url && (
        <div className="post-image-wrap">
          <img className="post-image" src={post.image_url} alt="" loading="lazy" />
        </div>
      )}

      {isOwn && !isEditing && (
        <div className="post-actions">
          <button type="button" className="post-action-link" onClick={startEdit}>Edit</button>
          <button type="button" className="post-action-link" onClick={handleDelete}>Delete</button>
        </div>
      )}

      <footer className="reaction-footer">
        <div className="reaction-bar" role="group" aria-label="React to this post">
          {REACTIONS.map(({ type, emoji, label }) => {
            const active = user_reaction === type;
            return (
              <button
                key={type}
                type="button"
                className={`reaction-btn${active ? ' active' : ''}`}
                aria-pressed={active}
                aria-label={label}
                title={label}
                onClick={() => onReact?.(post.id, type)}
                disabled={!REACTION_TYPES.includes(type)}
              >
                <span aria-hidden="true">{emoji}</span>
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
          <button
            type="button"
            className="reaction-count-btn"
            onClick={() => onShowReactors?.(post.id)}
            disabled={reaction_count === 0}
          >
            {reaction_count} {reaction_count === 1 ? 'reaction' : 'reactions'}
          </button>
          <button
            type="button"
            className="reaction-count-btn"
            onClick={() => onShowComments?.(post.id)}
          >
            {comment_count} {comment_count === 1 ? 'comment' : 'comments'}
          </button>
        </div>
      </footer>
    </article>
  );
}
