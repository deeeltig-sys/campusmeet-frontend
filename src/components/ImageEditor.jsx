import { useState, useRef, useEffect, useMemo } from 'react';
import {
  FILTER_PRESETS, DEFAULT_ADJUSTMENTS, buildFilterString, renderEditedImage, loadImageFromFile,
} from '../utils/imageEditor';

const ASPECTS = [
  { id: 'original', label: 'Original' },
  { id: '1:1', label: '1:1' },
  { id: '4:5', label: '4:5' },
  { id: '16:9', label: '16:9' },
];

/**
 * props:
 *   file        - the raw File the user picked
 *   onCancel()  - close without saving
 *   onDone(blob, previewUrl) - fires with the final edited image
 */
export default function ImageEditor({ file, onCancel, onDone }) {
  const [tab, setTab] = useState('crop'); // 'crop' | 'filter' | 'adjust'
  const [image, setImage] = useState(null);
  const [aspect, setAspect] = useState('original');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0.5, y: 0.5 });
  const [presetId, setPresetId] = useState('normal');
  const [adjustments, setAdjustments] = useState(DEFAULT_ADJUSTMENTS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dragState = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    loadImageFromFile(file).then((img) => { if (!cancelled) setImage(img); }).catch(() => setError('Could not open this image.'));
    return () => { cancelled = true; };
  }, [file]);

  const aspectRatio = useMemo(() => {
    if (aspect === '1:1') return 1;
    if (aspect === '4:5') return 4 / 5;
    if (aspect === '16:9') return 16 / 9;
    return image ? image.naturalWidth / image.naturalHeight : 1;
  }, [aspect, image]);

  const filterString = buildFilterString(presetId, adjustments);

  function handlePointerDown(e) {
    dragState.current = { startX: e.clientX, startY: e.clientY, panStart: pan };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function handlePointerMove(e) {
    if (!dragState.current || !frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragState.current.startX) / rect.width;
    const dy = (e.clientY - dragState.current.startY) / rect.height;
    // Dragging the image right/down should reveal more of the
    // left/top edge — i.e. the crop window moves opposite the finger.
    setPan({
      x: clamp01(dragState.current.panStart.x - dx),
      y: clamp01(dragState.current.panStart.y - dy),
    });
  }
  function handlePointerUp() {
    dragState.current = null;
  }

  async function handleDone() {
    if (!image) return;
    setBusy(true);
    setError('');
    try {
      const blob = await renderEditedImage(image, { x: pan.x, y: pan.y, scale: zoom }, aspect, presetId, adjustments);
      if (!blob) throw new Error('Could not process this image.');
      const previewUrl = URL.createObjectURL(blob);
      const edited = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg', lastModified: Date.now() });
      onDone(edited, previewUrl);
    } catch (err) {
      setError(err.message || 'Could not save your edits.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={busy ? undefined : onCancel}>
      <div
        className="modal-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 460, width: '100%' }}
      >
        <div className="modal-sheet-header">
          <strong style={{ fontFamily: 'var(--font-display)', color: 'var(--maroon-deep)' }}>Edit photo</strong>
          <button type="button" className="modal-sheet-close" onClick={onCancel} aria-label="Close" disabled={busy}>×</button>
        </div>

        <div className="modal-sheet-body">
        {error && <div className="banner-error">{error}</div>}

        <div
          ref={frameRef}
          onPointerDown={tab === 'crop' ? handlePointerDown : undefined}
          onPointerMove={tab === 'crop' ? handlePointerMove : undefined}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{
            position: 'relative', width: '100%', aspectRatio: String(aspectRatio),
            overflow: 'hidden', borderRadius: 12, background: '#000',
            marginBottom: 'var(--sp-3)', touchAction: 'none', cursor: tab === 'crop' ? 'grab' : 'default',
          }}
        >
          {image && (
            <img
              src={image.src}
              alt="Editing preview"
              draggable={false}
              style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: `translate(-50%, -50%) translate(${(0.5 - pan.x) * 100}%, ${(0.5 - pan.y) * 100}%) scale(${zoom})`,
                maxWidth: 'none', width: '100%', height: '100%', objectFit: 'cover',
                filter: filterString, userSelect: 'none',
              }}
            />
          )}
        </div>

        {tab === 'crop' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--sp-3)', flexWrap: 'wrap' }}>
              {ASPECTS.map((a) => (
                <button
                  key={a.id} type="button" onClick={() => setAspect(a.id)}
                  className={aspect === a.id ? 'btn btn-primary' : 'btn btn-ghost'}
                  style={{ padding: '6px 14px', fontSize: 'var(--fs-sm)' }}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <label style={{ display: 'block', fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', marginBottom: 4 }}>
              Zoom
            </label>
            <input
              type="range" min="1" max="3" step="0.01" value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              style={{ width: '100%', marginBottom: 'var(--sp-3)' }}
            />
          </>
        )}

        {tab === 'filter' && (
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, marginBottom: 'var(--sp-3)' }}>
            {FILTER_PRESETS.map((f) => (
              <button
                key={f.id} type="button" onClick={() => setPresetId(f.id)}
                style={{
                  flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  background: 'none', border: 'none', cursor: 'pointer',
                  opacity: presetId === f.id ? 1 : 0.7,
                }}
              >
                <span
                  style={{
                    width: 56, height: 56, borderRadius: 8, overflow: 'hidden',
                    border: presetId === f.id ? '2px solid var(--maroon)' : '2px solid transparent',
                    backgroundImage: image ? `url(${image.src})` : undefined,
                    backgroundSize: 'cover', backgroundPosition: 'center',
                    filter: f.css === 'none' ? 'none' : f.css, display: 'block',
                  }}
                />
                <span style={{ fontSize: '0.6875rem', color: 'var(--ink-soft)' }}>{f.label}</span>
              </button>
            ))}
          </div>
        )}

        {tab === 'adjust' && (
          <div style={{ marginBottom: 'var(--sp-3)' }}>
            {[
              ['brightness', 'Brightness'],
              ['contrast', 'Contrast'],
              ['saturation', 'Saturation'],
            ].map(([key, label]) => (
              <div key={key} style={{ marginBottom: 'var(--sp-2)' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)' }}>
                  <span>{label}</span><span>{adjustments[key]}%</span>
                </label>
                <input
                  type="range" min="50" max="150" value={adjustments[key]}
                  onChange={(e) => setAdjustments((prev) => ({ ...prev, [key]: parseInt(e.target.value, 10) }))}
                  style={{ width: '100%' }}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => setAdjustments(DEFAULT_ADJUSTMENTS)}
              style={{ background: 'none', border: 'none', color: 'var(--maroon)', fontSize: 'var(--fs-sm)', cursor: 'pointer', padding: 0 }}
            >
              Reset
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--sp-3)' }}>
          {[['crop', 'Crop'], ['filter', 'Filter'], ['adjust', 'Adjust']].map(([id, label]) => (
            <button
              key={id} type="button" onClick={() => setTab(id)}
              className={tab === id ? 'btn btn-primary' : 'btn btn-ghost'}
              style={{ flex: 1, padding: '8px 0', fontSize: 'var(--fs-sm)' }}
            >
              {label}
            </button>
          ))}
        </div>

        <button type="button" className="btn btn-primary btn-block" onClick={handleDone} disabled={busy || !image}>
          {busy ? 'Applying…' : 'Done'}
        </button>
        </div>
      </div>
    </div>
  );
}

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}
