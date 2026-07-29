import { useEffect, useState, useCallback, useMemo } from 'react';
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

  // Which top-level comment currently has its reply composer open, and
  // which threads are expanded. Replies start collapsed (IG-style
  // "View 3 replies") so a heavily-replied thread doesn't push every
  // other top-level comment off screen.
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [postingReply, setPostingReply] = useState(false);
  const [expandedThreads, setExpandedThreads] = useState(() => new Set());

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

  // Group into top-level comments + their replies. A comment with no
  // parent_comment_id (or one that doesn't match anything in this list)
  // is treated as top-level — this degrades safely if the backend hasn't
  // shipped parent_comment_id yet, since every comment just falls back
  // to flat top-level like before.
  const threads = useMemo(() => {
    const topLevel = [];
    const repliesByParent = new Map();
    for (const c of comments) {
      if (c.parent_comment_id) {
        const list = repliesByParent.get(c.parent_comment_id) || [];
        list.push(c);
        repliesByParent.set(c.parent_comment_id, list);
      } else {
        topLevel.push(c);
      }
    }
    return topLevel.map((c) => ({ comment: c, replies: repliesByParent.get(c.id) || [] }));
  }, [comments]);

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

  async function handlePostReply(topLevelId) {
    const content = replyDraft.trim();
    if (!content || postingReply) return;
    setPostingReply(true);
    setError('');
    try {
      const created = await CommentsAPI.create(postId, content, topLevelId);
      setComments((prev) => [...prev, created]);
      setReplyDraft('');
      setReplyingTo(null);
      setExpandedThreads((prev) => new Set(prev).add(topLevelId));
      onCommentCountChange?.(1);
    } catch (err) {
      setError(err.message || 'Could not post your reply.');
    } finally {
      setPostingReply(false);
    }
  }

  function toggleThread(topLevelId) {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      next.has(topLevelId) ? next.delete(topLevelId) : next.add(topLevelId);
      return next;
    });
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
      // Deleting a top-level comment takes its replies with it visually —
      // the backend should cascade-soft-delete them too, but drop them
      // from local state either way so the thread doesn't look orphaned.
      setComments((prev) => prev.filter((c) => c.id !== commentId && c.parent_comment_id !== commentId));
      onCommentCountChange?.(-1);
    } catch (err) {
      setError(err.message || 'Could not delete that comment.');
    }
  }

  function renderCommentBody(c, { isReply } = {}) {
    const isOwn = user?.id === c.author_id;
    const isEditing = editingId === c.id;
    return (
      <div className={isReply ? 'comment-row comment-row-reply' : 'comment-row'} key={c.id}>
        <div className="comment-row-header">
          <div className="avatar-circle" style={{ width: isReply ? 22 : 26, height: isReply ? 22 : 26, fontSize: '0.7rem' }}>
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
              {!isReply && (
                <button
                  type="button"
                  className="post-action-link"
                  onClick={() => {
                    setReplyingTo(replyingTo === c.id ? null : c.id);
                    setReplyDraft('');
                  }}
                >
                  Reply
                </button>
              )}
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
          ) : threads.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)' }}>No comments yet. Be the first to say something.</p>
          ) : (
            threads.map(({ comment, replies }) => {
              const expanded = expandedThreads.has(comment.id);
              return (
                <div key={comment.id} className="comment-thread-block">
                  {renderCommentBody(comment)}

                  {replyingTo === comment.id && (
                    <div className="comment-reply-composer">
                      <textarea
                        value={replyDraft}
                        onChange={(e) => setReplyDraft(e.target.value)}
                        placeholder={`Reply to ${comment.author_full_name?.split(' ')[0] || 'this comment'}…`}
                        rows={1}
                        maxLength={1000}
                        autoFocus
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ padding: '8px 14px' }}
                        onClick={() => handlePostReply(comment.id)}
                        disabled={postingReply || !replyDraft.trim()}
                      >
                        {postingReply ? '…' : 'Reply'}
                      </button>
                    </div>
                  )}

                  {replies.length > 0 && (
                    <div className="comment-thread">
                      {!expanded ? (
                        <button type="button" className="comment-thread-toggle" onClick={() => toggleThread(comment.id)}>
                          <span className="comment-thread-line" />
                          View {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                        </button>
                      ) : (
                        <>
                          {replies.map((r) => renderCommentBody(r, { isReply: true }))}
                          <button type="button" className="comment-thread-toggle" onClick={() => toggleThread(comment.id)}>
                            <span className="comment-thread-line" />
                            Hide replies
                          </button>
                        </>
                      )}
                    </div>
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
