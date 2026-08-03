import { useEffect, useRef, useState } from 'react';
import { StatusesAPI } from '../api/client';
import { SendIcon } from './icons';
import ImageEditor from './ImageEditor';

const BG_COLORS = ['#7a2436', '#111111', '#0a66c2', '#1f7a4d', '#c9a227', '#5b2a86'];
const MAX_TEXT_LENGTH = 280;

// The circular paper-plane send button — same shape/position (bottom
// right, floating over the preview) whether the status is a photo or
// text, so posting a status always ends the same pleasant way: a tap
// on a real send button, not a plain "Post status" bar. Matches the
// WhatsApp/Facebook status-composer pattern directly.
function SendButton({ onClick, disabled, posting }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || posting}
      aria-label="Send status"
      style={{
        position: 'absolute', bottom: 16, right: 16, width: 52, height: 52, borderRadius: '50%',
        background: disabled ? 'var(--ink-soft)' : 'var(--maroon)', border: '3px solid var(--ivory)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: disabled ? 'default' : 'pointer',
        boxShadow: '0 2px 10px rgba(0,0,0,0.25)', opacity: posting ? 0.7 : 1,
      }}
    >
      {posting ? (
        <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.5)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      ) : (
        <SendIcon size={20} />
      )}
    </button>
  );
}

export default function CreateStatusModal({ onClose, onPosted }) {
  const [mode, setMode] = useState(null); // 'photo' | 'text' | null (choosing)
  const [pendingFile, setPendingFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [editingFile, setEditingFile] = useState(null); // raw file pending crop/filter/adjust
  const fileInputRef = useRef(null);

  // Revoke the local object URL when it's replaced or the modal
  // closes, so picking several photos in a row doesn't leak memory.
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function handlePhotoPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    // Same edit stack as the post composer — crop/filter/adjust runs
    // before the send preview, not after.
    setEditingFile(file);
  }

  function handleEditorDone(editedFile) {
    setEditingFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(editedFile);
    setPreviewUrl(URL.createObjectURL(editedFile));
    setMode('photo');
  }

  async function handleSendPhoto() {
    if (!pendingFile) return;
    setPosting(true);
    setError('');
    try {
      const { url } = await StatusesAPI.uploadImage(pendingFile);
      await StatusesAPI.create({ content_type: 'image', image_url: url });
      onPosted();
    } catch (err) {
      setError(err.message || 'Could not post status.');
      setPosting(false);
    }
  }

  async function handleSendText() {
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

  function handleRetakePhoto() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(null);
    setPreviewUrl(null);
    setMode(null);
  }

  return (
    <div className="modal-overlay" onClick={posting ? undefined : onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet-header">
          <strong style={{ fontFamily: 'var(--font-display)', color: 'var(--maroon-deep)' }}>
            {mode === 'photo' ? 'Preview' : 'Add status'}
          </strong>
          <button type="button" className="modal-sheet-close" onClick={onClose} aria-label="Close" disabled={posting}>×</button>
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

        {/* Photo preview — this is the actual fix: picking a photo used
            to upload and post it immediately with zero chance to look
            at it first. Now it's a real preview, matching WhatsApp/FB:
            see the photo full-size, then tap send. */}
        {mode === 'photo' && previewUrl && (
          <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', marginBottom: 'var(--sp-2)' }}>
            <img
              src={previewUrl} alt="Status preview"
              style={{ width: '100%', maxHeight: 420, objectFit: 'contain', background: '#000', display: 'block' }}
            />
            <button
              type="button" onClick={handleRetakePhoto} disabled={posting}
              style={{
                position: 'absolute', top: 12, left: 12, padding: '6px 14px', borderRadius: 999,
                background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', fontSize: 'var(--fs-xs)', cursor: 'pointer',
              }}
            >
              Choose another
            </button>
            <button
              type="button" onClick={() => pendingFile && setEditingFile(pendingFile)} disabled={posting}
              style={{
                position: 'absolute', top: 12, right: 12, padding: '6px 14px', borderRadius: 999,
                background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', fontSize: 'var(--fs-xs)', cursor: 'pointer',
              }}
            >
              Edit
            </button>
            <SendButton onClick={handleSendPhoto} posting={posting} />
          </div>
        )}

        {mode === 'text' && (
          <>
            <div style={{
              position: 'relative', background: bgColor, borderRadius: 12, minHeight: 220, display: 'flex',
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
              <SendButton onClick={handleSendText} disabled={!text.trim()} posting={posting} />
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
          </>
        )}
      </div>

      {editingFile && (
        <ImageEditor
          file={editingFile}
          onCancel={() => setEditingFile(null)}
          onDone={handleEditorDone}
        />
      )}
    </div>
  );
}
