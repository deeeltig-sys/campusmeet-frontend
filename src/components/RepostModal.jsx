import { useState } from 'react';
import { PostsAPI } from '../api/client';

export default function RepostModal({ post, onClose, onReposted }) {
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  async function handleRepost() {
    setPosting(true);
    setError('');
    try {
      await PostsAPI.repost(post.id, comment);
      onReposted?.();
      onClose();
    } catch (err) {
      setError(err.message || "That repost didn't go through.");
      setPosting(false);
    }
  }

  const authorName = post.author?.full_name || post.author_full_name || 'Student';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet-header">
          <strong style={{ fontFamily: 'var(--font-display)', color: 'var(--maroon-deep)' }}>Repost</strong>
          <button type="button" className="modal-sheet-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {error && <div className="banner-error">{error}</div>}

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 2000))}
          placeholder="Add a comment (optional)…"
          rows={2}
          style={{
            width: '100%', resize: 'vertical', padding: '10px 12px', border: '1px solid var(--line)',
            borderRadius: 10, fontFamily: 'inherit', fontSize: 'var(--fs-sm)', boxSizing: 'border-box', marginBottom: 'var(--sp-3)',
          }}
        />

        {/* Preview of what's being reposted */}
        <div className="card" style={{ marginBottom: 'var(--sp-4)', pointerEvents: 'none' }}>
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', marginBottom: 4 }}>{authorName}</p>
          <p style={{ fontSize: 'var(--fs-sm)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
            {post.content}
          </p>
        </div>

        <button type="button" className="btn btn-primary btn-block" onClick={handleRepost} disabled={posting}>
          {posting ? 'Reposting…' : 'Repost'}
        </button>
      </div>
    </div>
  );
}
