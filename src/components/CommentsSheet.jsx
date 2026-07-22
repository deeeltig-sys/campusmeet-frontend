import { useEffect, useState, useCallback } from 'react';
import { CommentsAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import VerifiedBadge from './VerifiedBadge';
import ReportModal from './ReportModal';

export default function CommentsSheet({ postId, onClose, onCommentCountChange }) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [reportingId, setReportingId] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await CommentsAPI.list(postId);
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load comments.');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => { load(); }, [load]);

  async function handlePost() {
    const content = draft.trim();
    if (!content || posting) return;
    setPosting(true);
    setError('');
    try {
      const created = await CommentsAPI.create(postId, content);
      setComments((prev) => [...prev, created]);
      setDraft('');
      onCommentCountChange?.(1);
    } catch (err) {
      setError(err.message || 'Could not post your comment.');
    } finally {
      setPosting(false);
    }
  }

  function startEdit(comment) {
    setEditingId(comment.id);
    setEditDraft(comment.content);
  }

  async function saveEdit(commentId) {
    const content = editDraft.trim();
    if (!content) return;
    try {
      const updated = await CommentsAPI.update(postId, commentId, content);
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
      setEditingId(null);
    } catch (err) {
      setError(err.message || 'Could not save your edit.');
    }
  }

  async function handleDelete(commentId) {
    try {
      await CommentsAPI.softDelete(postId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onCommentCountChange?.(-1);
    } catch (err) {
      setError(err.message || 'Could not delete that comment.');
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet-header">
          <strong style={{ fontFamily: 'var(--font-display)', color: 'var(--maroon-deep)' }}>
            Comments
          </strong>
          <button type="button" className="modal-sheet-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="modal-sheet-body">
          {error && <div className="banner-error">{error}</div>}

          {loading ? (
            <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
          ) : comments.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)' }}>No comments yet. Be the first to say something.</p>
          ) : (
            comments.map((c) => {
              const isOwn = user?.id === c.author_id;
              const isEditing = editingId === c.id;
              return (
                <div className="comment-row" key={c.id}>
                  <div className="comment-row-header">
                    <div className="avatar-circle" style={{ width: 26, height: 26, fontSize: '0.7rem' }}>
                      {c.author_avatar_url ? (
                        <img src={c.author_avatar_url} alt="" />
                      ) : (
                        c.author_full_name ? c.author_full_name.charAt(0) : '?'
                      )}
                    </div>
                    <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 600 }}>
                      {c.author_full_name || 'Student'}
                    </span>
                    <VerifiedBadge verified={c.author_verified} size={12} />
                    <span className="comment-meta">
                      {c.created_at ? new Date(c.created_at).toLocaleString() : ''}
                    </span>
                  </div>

                  {isEditing ? (
                    <>
                      <textarea
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        rows={2}
                        style={{
                          width: '100%', fontFamily: 'var(--font-body)', fontSize: 'var(--fs-sm)',
                          borderRadius: 'var(--radius-md)', border: '1px solid var(--line)', padding: 'var(--sp-2)',
                        }}
                      />
                      <div className="comment-actions">
                        <button type="button" className="post-action-link" onClick={() => saveEdit(c.id)}>Save</button>
                        <button type="button" className="post-action-link" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p style={{ margin: 0, fontSize: 'var(--fs-sm)', lineHeight: 1.5 }}>{c.content}</p>
                      <div className="comment-actions">
                        {isOwn ? (
                          <>
                            <button type="button" className="post-action-link" onClick={() => startEdit(c)}>Edit</button>
                            <button type="button" className="post-action-link" onClick={() => handleDelete(c.id)}>Delete</button>
                          </>
                        ) : (
                          <button type="button" className="post-action-link" onClick={() => setReportingId(c.id)}>Report</button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="comment-composer">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a comment…"
            rows={1}
            maxLength={1000}
          />
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '10px 16px' }}
            onClick={handlePost}
            disabled={posting || !draft.trim()}
          >
            {posting ? '…' : 'Post'}
          </button>
        </div>
      </div>

      {reportingId && (
        <ReportModal targetType="comment" targetId={reportingId} onClose={() => setReportingId(null)} />
      )}
    </div>
  );
}
