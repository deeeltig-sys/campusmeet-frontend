import { useState, useRef, useEffect, useMemo } from 'react';
import {
  FILTER_PRESETS, DEFAULT_ADJUSTMENTS, buildFilterString, renderEditedImage, loadImageFromFile,
} from '../utils/imageEditor';
import '../styles/imageStudio.css';

const ASPECTS = [
  { id: 'original', label: 'Original' },
  { id: '1:1', label: '1:1' },
  { id: '4:5', label: '4:5' },
  { id: '16:9', label: '16:9' },
];

const TABS = [
  { id: 'crop', label: 'Crop' },
  { id: 'filter', label: 'Filter' },
  { id: 'adjust', label: 'Adjust' },
];

/**
 * The shared photo-editing studio — crop/zoom, filters, and
 * brightness/contrast/saturation. Same component mounts inside both
 * the post composer and the story composer, so any polish here shows
 * up in both places, on phone and desktop alike (see imageStudio.css
 * for the responsive split layout).
 *
 * props:
 *   file        - the raw File the user picked
 *   onCancel()  - close without saving
 *   onDone(editedFile, previewUrl) - fires with the final edited image
 */
export default function ImageEditor({ file, onCancel, onDone }) {
  const [tab, setTab] = useState('crop'); // 'crop' | 'filter' | 'adjust'
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
    setError('');
    setImage(null);
    // loadImageFromFile creates a fresh blob URL every call — if it
    // never resolves (a decode error, an unsupported format that
    // slipped past the picker's accept filter, etc.) the previous
    // code left `image` at null with nothing visible on screen: no
    // spinner, no error, just a blank box. loading/error are explicit
    // states rendered inside the frame itself now, so a failure is
    // always visible, never silent.
    let objectUrl = null;
    loadImageFromFile(file)
      .then((img) => {
        if (cancelled) return;
        objectUrl = img.src;
        setImage(img);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Could not open this image. Try a different photo.');
        setLoading(false);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  const aspectRatio = useMemo(() => {
    if (aspect === '1:1') return 1;
    if (aspect === '4:5') return 4 / 5;
    if (aspect === '16:9') return 16 / 9;
    return image ? image.naturalWidth / image.naturalHeight : 1;
  }, [aspect, image]);

  const filterString = buildFilterString(presetId, adjustments);
  const tabIndex = TABS.findIndex((t) => t.id === tab);

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
    <div className="studio-overlay" onClick={busy ? undefined : onCancel}>
      <div className="studio-panel" onClick={(e) => e.stopPropagation()}>
        <div className="studio-header">
          <span className="studio-title">Edit photo</span>
          <button type="button" className="studio-close" onClick={onCancel} aria-label="Close" disabled={busy}>×</button>
        </div>

        <div className="studio-body">
          <div className="studio-canvas-wrap">
            <div
              ref={frameRef}
              className="studio-frame"
              onPointerDown={tab === 'crop' ? handlePointerDown : undefined}
              onPointerMove={tab === 'crop' ? handlePointerMove : undefined}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              style={{
                aspectRatio: String(aspectRatio),
                cursor: tab === 'crop' ? 'grab' : 'default',
                maxHeight: '100%',
              }}
            >
              {loading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="studio-spinner" />
                </div>
              )}
              {!loading && error && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-4)' }}>
                  <p style={{ color: '#fff', fontSize: 'var(--fs-sm)', textAlign: 'center', margin: 0 }}>{error}</p>
                </div>
              )}
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
          </div>

          <div className="studio-controls">
            <div className="studio-tabs">
              <div className="studio-tab-highlight" style={{ transform: `translateX(${tabIndex * 100}%)` }} />
              {TABS.map((t) => (
                <button
                  key={t.id} type="button"
                  className={`studio-tab${tab === t.id ? ' active' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {error && !loading && image && <div className="studio-error-banner">{error}</div>}

            {tab === 'crop' && (
              <>
                <div className="studio-aspect-row">
                  {ASPECTS.map((a) => (
                    <button
                      key={a.id} type="button" onClick={() => setAspect(a.id)}
                      className={`studio-chip${aspect === a.id ? ' active' : ''}`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
                <div className="studio-label-row"><span>Zoom</span><span>{zoom.toFixed(2)}×</span></div>
                <input
                  type="range" min="1" max="3" step="0.01" value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="studio-slider"
                />
              </>
            )}

            {tab === 'filter' && (
              <div className="studio-filter-row">
                {FILTER_PRESETS.map((f) => (
                  <button
                    key={f.id} type="button" onClick={() => setPresetId(f.id)}
                    className={`studio-filter-btn${presetId === f.id ? ' active' : ''}`}
                  >
                    <span
                      className="studio-filter-thumb"
                      style={{
                        backgroundImage: image ? `url(${image.src})` : undefined,
                        filter: f.css === 'none' ? 'none' : f.css,
                      }}
                    />
                    <span className="studio-filter-label">{f.label}</span>
                  </button>
                ))}
              </div>
            )}

            {tab === 'adjust' && (
              <div>
                {[
                  ['brightness', 'Brightness'],
                  ['contrast', 'Contrast'],
                  ['saturation', 'Saturation'],
                ].map(([key, label]) => (
                  <div key={key}>
                    <div className="studio-label-row"><span>{label}</span><span>{adjustments[key]}%</span></div>
                    <input
                      type="range" min="50" max="150" value={adjustments[key]}
                      onChange={(e) => setAdjustments((prev) => ({ ...prev, [key]: parseInt(e.target.value, 10) }))}
                      className="studio-slider"
                    />
                  </div>
                ))}
                <button type="button" className="studio-reset-link" onClick={() => setAdjustments(DEFAULT_ADJUSTMENTS)}>
                  Reset
                </button>
              </div>
            )}

            <button type="button" className="studio-done-btn" onClick={handleDone} disabled={busy || !image}>
              {busy ? 'Applying…' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}
