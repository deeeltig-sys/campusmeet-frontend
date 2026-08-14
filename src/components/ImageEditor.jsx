import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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
  { id: 'draw', label: 'Draw' },
  { id: 'text', label: 'Text' },
];

const DRAW_COLORS = ['#ffffff', '#1A1210', '#A6272C', '#D4AF37', '#2E6B44', '#0a66c2'];
const TEXT_COLORS = ['#ffffff', '#1A1210', '#D4AF37', '#A6272C', '#0a66c2'];
const BRUSH_SIZES = [
  { id: 'thin', label: 'Thin', value: 0.006 },
  { id: 'medium', label: 'Medium', value: 0.014 },
  { id: 'thick', label: 'Thick', value: 0.026 },
];

let nextId = 1;
const makeId = () => `el${nextId++}`;

/**
 * The shared photo-editing studio — crop/zoom, filters, brightness/
 * contrast/saturation, freehand drawing, and draggable text overlays.
 * Same component mounts inside both the post composer and the story
 * composer, so this covers both surfaces at once, on phone and
 * desktop (see imageStudio.css for the responsive split layout).
 *
 * Draw and Text overlays are stored normalized (0-1) relative to the
 * frame as it appears at the moment they're placed. That's why those
 * two tabs come after Crop — changing crop/zoom/pan after drawing
 * would shift the frame's visible content under already-placed
 * strokes/text, same limitation most lightweight editors have.
 *
 * props:
 *   file        - the raw File the user picked
 *   onCancel()  - close without saving
 *   onDone(editedFile, previewUrl) - fires with the final edited image
 */
export default function ImageEditor({ file, onCancel, onDone }) {
  const [tab, setTab] = useState('crop');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aspect, setAspect] = useState('original');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0.5, y: 0.5 });
  const [presetId, setPresetId] = useState('normal');
  const [adjustments, setAdjustments] = useState(DEFAULT_ADJUSTMENTS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Draw tool state
  const [strokes, setStrokes] = useState([]);
  const [drawColor, setDrawColor] = useState(DRAW_COLORS[0]);
  const [brushSize, setBrushSize] = useState(BRUSH_SIZES[1].value);

  // Text tool state
  const [texts, setTexts] = useState([]);
  const [activeTextId, setActiveTextId] = useState(null);
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });

  const dragState = useRef(null);
  const frameRef = useRef(null);
  const drawCanvasRef = useRef(null);
  const drawingRef = useRef(null); // { points: [{x,y}] } while a stroke is in progress
  const textDragRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setImage(null);
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
  const activeText = texts.find((t) => t.id === activeTextId) || null;

  // Keeps the draw canvas's pixel buffer in sync with its displayed
  // CSS size (frame resizes on aspect-ratio change / desktop-vs-mobile
  // layout switch) and replays existing strokes so switching tabs or
  // resizing never loses what's already been drawn.
  const resizeAndRedrawCanvas = useCallback(() => {
    const canvas = drawCanvasRef.current;
    const frame = frameRef.current;
    if (!canvas || !frame) return;
    const rect = frame.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    canvas.width = rect.width;
    canvas.height = rect.height;
    setFrameSize({ width: rect.width, height: rect.height });
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokes) {
      drawStrokeOnCanvas(ctx, stroke, canvas.width, canvas.height);
    }
  }, [strokes]);

  useEffect(() => {
    resizeAndRedrawCanvas();
  }, [resizeAndRedrawCanvas, aspectRatio, tab]);

  useEffect(() => {
    function onResize() { resizeAndRedrawCanvas(); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [resizeAndRedrawCanvas]);

  function normalizedPointFromEvent(e) {
    const rect = frameRef.current.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  }

  // Crop-tab panning
  function handleFramePointerDown(e) {
    if (tab === 'crop') {
      dragState.current = { startX: e.clientX, startY: e.clientY, panStart: pan };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } else if (tab === 'draw') {
      const canvas = drawCanvasRef.current;
      const point = normalizedPointFromEvent(e);
      drawingRef.current = { points: [point] };
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = drawColor;
      ctx.lineWidth = Math.max(1, brushSize * canvas.width);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(point.x * canvas.width, point.y * canvas.height);
      canvas.setPointerCapture?.(e.pointerId);
    }
  }
  function handleFramePointerMove(e) {
    if (tab === 'crop' && dragState.current) {
      const rect = frameRef.current.getBoundingClientRect();
      const dx = (e.clientX - dragState.current.startX) / rect.width;
      const dy = (e.clientY - dragState.current.startY) / rect.height;
      setPan({
        x: clamp01(dragState.current.panStart.x - dx),
        y: clamp01(dragState.current.panStart.y - dy),
      });
    } else if (tab === 'draw' && drawingRef.current) {
      const canvas = drawCanvasRef.current;
      const point = normalizedPointFromEvent(e);
      drawingRef.current.points.push(point);
      const ctx = canvas.getContext('2d');
      ctx.lineTo(point.x * canvas.width, point.y * canvas.height);
      ctx.stroke();
    }
  }
  function handleFramePointerUp() {
    dragState.current = null;
    if (tab === 'draw' && drawingRef.current) {
      if (drawingRef.current.points.length > 1) {
        setStrokes((prev) => [...prev, { id: makeId(), color: drawColor, size: brushSize, points: drawingRef.current.points }]);
      }
      drawingRef.current = null;
    }
  }

  function undoStroke() {
    setStrokes((prev) => prev.slice(0, -1));
  }
  function clearStrokes() {
    setStrokes([]);
  }

  function addText() {
    const id = makeId();
    setTexts((prev) => [...prev, { id, text: 'Tap to edit', x: 0.5, y: 0.5, fontSize: 0.07, color: TEXT_COLORS[0] }]);
    setActiveTextId(id);
  }
  function updateActiveText(patch) {
    if (!activeTextId) return;
    setTexts((prev) => prev.map((t) => (t.id === activeTextId ? { ...t, ...patch } : t)));
  }
  function deleteActiveText() {
    if (!activeTextId) return;
    setTexts((prev) => prev.filter((t) => t.id !== activeTextId));
    setActiveTextId(null);
  }
  function handleTextPointerDown(e, id) {
    e.stopPropagation();
    setActiveTextId(id);
    const t = texts.find((tx) => tx.id === id);
    textDragRef.current = { startX: e.clientX, startY: e.clientY, origin: { x: t.x, y: t.y }, id };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function handleTextPointerMove(e) {
    if (!textDragRef.current || !frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    const dx = (e.clientX - textDragRef.current.startX) / rect.width;
    const dy = (e.clientY - textDragRef.current.startY) / rect.height;
    const { id, origin } = textDragRef.current;
    setTexts((prev) => prev.map((t) => (t.id === id ? { ...t, x: clamp01(origin.x + dx), y: clamp01(origin.y + dy) } : t)));
  }
  function handleTextPointerUp() {
    textDragRef.current = null;
  }

  async function handleDone() {
    if (!image) return;
    setBusy(true);
    setError('');
    try {
      const overlays = { strokes, texts };
      const blob = await renderEditedImage(image, { x: pan.x, y: pan.y, scale: zoom }, aspect, presetId, adjustments, overlays);
      if (!blob) throw new Error('Could not process this image.');
      const previewUrl = URL.createObjectURL(blob);
      const edited = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg', lastModified: Date.now() });
      onDone(edited, previewUrl);
    } catch (err) {
      setError(err.message || "Your edits didn't save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  // Safety net for when the photo can't be decoded/previewed at all
  // (unsupported format, corrupt file, etc.) — rather than leaving the
  // person stuck with a dead Done button and no way forward, this posts
  // the original file untouched, same as if they'd chosen not to edit.
  function handleUseOriginal() {
    setBusy(true);
    try {
      const previewUrl = URL.createObjectURL(file);
      onDone(file, previewUrl);
    } finally {
      setBusy(false);
    }
  }

  const frameInteractive = tab === 'crop' || tab === 'draw';

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
              onPointerDown={frameInteractive ? handleFramePointerDown : undefined}
              onPointerMove={frameInteractive ? handleFramePointerMove : (tab === 'text' ? handleTextPointerMove : undefined)}
              onPointerUp={frameInteractive ? handleFramePointerUp : (tab === 'text' ? handleTextPointerUp : undefined)}
              onPointerLeave={frameInteractive ? handleFramePointerUp : undefined}
              style={{
                aspectRatio: String(aspectRatio),
                cursor: tab === 'crop' ? 'grab' : tab === 'draw' ? 'crosshair' : 'default',
                maxHeight: '100%',
              }}
            >
              {loading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="studio-spinner" />
                </div>
              )}
              {!loading && error && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-4)' }}>
                  <p style={{ color: '#fff', fontSize: 'var(--fs-sm)', textAlign: 'center', margin: 0 }}>{error}</p>
                  <button
                    type="button"
                    className="studio-done-btn"
                    style={{ width: 'auto', padding: '10px 22px' }}
                    onClick={handleUseOriginal}
                    disabled={busy}
                  >
                    {busy ? 'Preparing…' : 'Use original photo'}
                  </button>
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
              {image && <canvas ref={drawCanvasRef} className="studio-draw-canvas" />}
              {image && texts.map((t) => (
                <div
                  key={t.id}
                  className={`studio-text-element${t.id === activeTextId ? ' active' : ''}`}
                  style={{ left: `${t.x * 100}%`, top: `${t.y * 100}%`, fontSize: `${Math.max(8, t.fontSize * frameSize.width)}px`, color: t.color }}
                  onPointerDown={(e) => handleTextPointerDown(e, t.id)}
                  onClick={(e) => { e.stopPropagation(); setActiveTextId(t.id); }}
                >
                  {t.text}
                </div>
              ))}
            </div>
          </div>

          <div className="studio-controls">
            <div className="studio-tabs">
              <div className="studio-tab-highlight" style={{ width: `calc(${100 / TABS.length}% - 2px)`, transform: `translateX(${tabIndex * 100}%)` }} />
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

            {tab === 'draw' && (
              <>
                <p className="studio-hint">Drag your finger or cursor over the photo to draw.</p>
                <div className="studio-color-row">
                  {DRAW_COLORS.map((c) => (
                    <button
                      key={c} type="button"
                      className={`studio-color-swatch${drawColor === c ? ' active' : ''}`}
                      style={{ background: c, border: c === '#ffffff' ? '2px solid rgba(255,255,255,0.3)' : undefined }}
                      onClick={() => setDrawColor(c)}
                      aria-label={`Brush color ${c}`}
                    />
                  ))}
                </div>
                <div className="studio-aspect-row">
                  {BRUSH_SIZES.map((s) => (
                    <button
                      key={s.id} type="button" onClick={() => setBrushSize(s.value)}
                      className={`studio-chip${brushSize === s.value ? ' active' : ''}`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <div className="studio-icon-row">
                  <button type="button" className="studio-icon-btn" onClick={undoStroke} disabled={strokes.length === 0}>Undo</button>
                  <button type="button" className="studio-icon-btn danger" onClick={clearStrokes} disabled={strokes.length === 0}>Clear all</button>
                </div>
              </>
            )}

            {tab === 'text' && (
              <>
                <button type="button" className="studio-add-text-btn" onClick={addText}>+ Add text</button>
                {activeText ? (
                  <>
                    <input
                      type="text"
                      className="studio-text-input"
                      value={activeText.text}
                      onChange={(e) => updateActiveText({ text: e.target.value })}
                      placeholder="Type something…"
                      maxLength={80}
                    />
                    <div className="studio-color-row">
                      {TEXT_COLORS.map((c) => (
                        <button
                          key={c} type="button"
                          className={`studio-color-swatch${activeText.color === c ? ' active' : ''}`}
                          style={{ background: c, border: c === '#ffffff' ? '2px solid rgba(255,255,255,0.3)' : undefined }}
                          onClick={() => updateActiveText({ color: c })}
                          aria-label={`Text color ${c}`}
                        />
                      ))}
                    </div>
                    <div className="studio-label-row"><span>Size</span><span>{Math.round(activeText.fontSize * 1000)}</span></div>
                    <input
                      type="range" min="0.03" max="0.14" step="0.002" value={activeText.fontSize}
                      onChange={(e) => updateActiveText({ fontSize: parseFloat(e.target.value) })}
                      className="studio-slider"
                    />
                    <div className="studio-icon-row">
                      <button type="button" className="studio-icon-btn danger" onClick={deleteActiveText}>Delete text</button>
                    </div>
                  </>
                ) : (
                  <p className="studio-hint">{texts.length > 0 ? 'Tap a text element on the photo to edit it, or drag it to reposition.' : 'Add text, then drag it anywhere on the photo.'}</p>
                )}
              </>
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

function drawStrokeOnCanvas(ctx, stroke, canvasW, canvasH) {
  if (!stroke.points || stroke.points.length < 2) return;
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = Math.max(1, stroke.size * canvasW);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x * canvasW, stroke.points[0].y * canvasH);
  for (let i = 1; i < stroke.points.length; i++) {
    ctx.lineTo(stroke.points[i].x * canvasW, stroke.points[i].y * canvasH);
  }
  ctx.stroke();
}

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}
