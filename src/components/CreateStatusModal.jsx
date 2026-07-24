import { useRef, useState } from 'react';
import { StatusesAPI } from '../api/client';

const BG_COLORS = ['#7a2436', '#111111', '#0a66c2', '#1f7a4d', '#c9a227', '#5b2a86'];
const MAX_TEXT_LENGTH = 280;

export default function CreateStatusModal({ onClose, onPosted }) {
  const [mode, setMode] = useState(null); // 'photo' | 'text' | null (choosing)
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  async function handlePhotoPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPosting(true);
    setError('');
    try {
      const { url } = await StatusesAPI.uploadImage(file);
      await StatusesAPI.create({ content_type: 'image', image_url: url });
      onPosted();
    } catch (err) {
      setError(err.message || 'Could not post status.');
      setPosting(false);
    }
  }

  async function handlePostText() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPosting(true);
    setError('');
    try {
      await StatusesAPI.create({ content_type: 'text', text_content: trimmed, background_color: bgColor });
      onPosted();
    } catch (err) {
      setError(err.message || 'Could not post status.');
      setPosting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet-header">
          <strong style={{ fontFamily: 'var(--font-display)', color: 'var(--maroon-deep)' }}>Add status</strong>
          <button type="button" className="modal-sheet-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {error && <div className="banner-error">{error}</div>}

        {mode === null && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            <button type="button" className="btn btn-primary btn-block" onClick={() => fileInputRef.current?.click()}>
              📷 Photo status
            </button>
            <button type="button" className="btn btn-ghost btn-block" onClick={() => setMode('text')}>
              Aa Text status
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoPick} style={{ display: 'none' }} />
          </div>
        )}

        {mode === 'text' && (
          <>
            <div style={{
              background: bgColor, borderRadius: 12, minHeight: 160, display: 'flex',
              alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-4)', marginBottom: 'var(--sp-3)',
            }}>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT_LENGTH))}
                placeholder="What's on your mind?"
                rows={4}
                autoFocus
                style={{
                  background: 'transparent', border: 'none', outline: 'none', resize: 'none',
                  color: '#fff', fontSize: 'var(--fs-lg)', textAlign: 'center', width: '100%',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--sp-3)', justifyContent: 'center' }}>
              {BG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setBgColor(c)}
                  aria-label={`Background ${c}`}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: bgColor === c ? '2px solid var(--gold-bright)' : '2px solid transparent',
                  }}
                />
              ))}
            </div>
            <button type="button" className="btn btn-primary btn-block" onClick={handlePostText} disabled={posting || !text.trim()}>
              {posting ? 'Posting…' : 'Post status'}
            </button>
          </>
        )}

        {posting && mode !== 'text' && <p style={{ color: 'var(--ink-soft)', textAlign: 'center' }}>Posting…</p>}
      </div>
    </div>
  );
}
