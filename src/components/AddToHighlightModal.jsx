import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { HighlightsAPI } from '../api/client';

export default function AddToHighlightModal({ statusId, onClose, onAdded }) {
  const { user } = useAuth();
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    HighlightsAPI.listForUser(user.id)
      .then((data) => setHighlights(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || 'Could not load your highlights.'))
      .finally(() => setLoading(false));
  }, [user.id]);

  async function handleAddTo(highlightId) {
    setBusyId(highlightId);
    setError('');
    try {
      await HighlightsAPI.addItem(highlightId, statusId);
      onAdded?.();
      onClose?.();
    } catch (err) {
      setError(err.message || 'Could not add to that highlight.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleCreateAndAdd(e) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setCreating(true);
    setError('');
    try {
      const highlight = await HighlightsAPI.create(title);
      await HighlightsAPI.addItem(highlight.id, statusId);
      onAdded?.();
      onClose?.();
    } catch (err) {
      setError(err.message || 'Could not create that highlight.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet-header">
          <strong style={{ fontFamily: 'var(--font-display)', color: 'var(--maroon-deep)' }}>Add to Highlight</strong>
          <button type="button" className="modal-sheet-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-sheet-body">
          {error && <div className="banner-error">{error}</div>}

          <form onSubmit={handleCreateAndAdd} style={{ display: 'flex', gap: 8, marginBottom: 'var(--sp-3)' }}>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="New highlight title"
              maxLength={40}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary" disabled={creating || !newTitle.trim()} style={{ fontSize: 'var(--fs-sm)', padding: '6px 14px' }}>
              {creating ? 'Adding…' : 'Create'}
            </button>
          </form>

          {loading ? (
            <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
          ) : highlights.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)', fontSize: 'var(--fs-sm)' }}>No highlights yet — create your first one above.</p>
          ) : (
            highlights.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => handleAddTo(h.id)}
                disabled={busyId === h.id}
                className="reactor-row"
                style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer' }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                  background: 'var(--maroon-light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {h.cover_url ? (
                    <img src={h.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontFamily: 'var(--font-display)', color: 'var(--maroon-deep)', fontSize: '0.85rem' }}>
                      {h.title.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span style={{ flex: 1, fontSize: 'var(--fs-sm)' }}>{h.title}</span>
                {busyId === h.id && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)' }}>Adding…</span>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
