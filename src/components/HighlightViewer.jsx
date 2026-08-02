import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { HighlightsAPI } from '../api/client';

const SLIDE_DURATION_MS = 5000;

export default function HighlightViewer({ highlightId, onClose }) {
  const { user } = useAuth();
  const [highlight, setHighlight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    HighlightsAPI.get(highlightId)
      .then(setHighlight)
      .catch((err) => setError(err.message || 'Could not load this highlight.'))
      .finally(() => setLoading(false));
  }, [highlightId]);

  const items = highlight?.items || [];
  const current = items[index];
  const isOwn = highlight?.user_id === user?.id;

  useEffect(() => {
    if (!current || paused) return;
    setProgress(0);
    startRef.current = performance.now();
    function tick(now) {
      const elapsed = now - startRef.current;
      const pct = Math.min(1, elapsed / SLIDE_DURATION_MS);
      setProgress(pct);
      if (pct >= 1) {
        goNext();
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, paused, current?.id]);

  function goNext() {
    if (index < items.length - 1) setIndex((i) => i + 1);
    else onClose?.();
  }
  function goPrev() {
    if (index > 0) setIndex((i) => i - 1);
    else onClose?.();
  }

  async function handleRemoveItem() {
    if (!window.confirm('Remove this from the highlight?')) return;
    try {
      await HighlightsAPI.deleteItem(highlightId, current.id);
      if (items.length === 1) {
        onClose?.();
      } else {
        setHighlight((h) => ({ ...h, items: h.items.filter((it) => it.id !== current.id) }));
        setIndex((i) => Math.min(i, items.length - 2));
      }
    } catch {
      // worst case the item just stays
    }
  }

  if (loading) return null;
  if (error || !current) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#fff', textAlign: 'center' }}>
          <p>{error || 'Nothing to show.'}</p>
          <button type="button" onClick={onClose} style={{ color: '#fff', background: 'none', border: '1px solid #fff', borderRadius: 999, padding: '6px 16px', marginTop: 12, cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
    );
  }

  const isTextItem = current.content_type === 'text';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#000', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', gap: 4, padding: 'var(--sp-3) var(--sp-3) 0' }}>
        {items.map((it, i) => (
          <div key={it.id} style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.35)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: '#fff', borderRadius: 2,
              width: i < index ? '100%' : i === index ? `${progress * 100}%` : '0%',
            }} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', padding: 'var(--sp-3)' }}>
        <strong style={{ color: '#fff', fontSize: 'var(--fs-sm)', flex: 1 }}>{highlight.title}</strong>
        {isOwn && (
          <button type="button" onClick={handleRemoveItem} aria-label="Remove item" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', fontSize: '0.8rem' }}>
            Remove
          </button>
        )}
        <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}>
          ×
        </button>
      </div>

      <div
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
      >
        <button type="button" onClick={goPrev} aria-label="Previous" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '35%', background: 'none', border: 'none', cursor: 'pointer' }} />
        <button type="button" onClick={goNext} aria-label="Next" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '35%', background: 'none', border: 'none', cursor: 'pointer' }} />

        {isTextItem ? (
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: current.background_color || '#7a2436', padding: 'var(--sp-5)',
          }}>
            <p style={{ color: '#fff', fontSize: 'var(--fs-xl)', textAlign: 'center', lineHeight: 1.5 }}>{current.text_content}</p>
          </div>
        ) : (
          <img src={current.image_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} draggable={false} />
        )}
      </div>
    </div>
  );
}
