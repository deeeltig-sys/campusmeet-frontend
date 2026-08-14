// Shared editing engine for the post composer and the story composer.
// Everything here works the way FB/IG's edit stack works: crop/zoom is
// just a transform (nothing destroyed until export), filters are CSS
// filter presets, adjustments are extra CSS filter values layered on
// top — all rendered together into one canvas at export time, which
// is what actually gets uploaded. No third-party libraries needed.

export const FILTER_PRESETS = [
  { id: 'normal', label: 'Normal', css: 'none' },
  { id: 'mono', label: 'B&W', css: 'grayscale(1) contrast(1.08)' },
  { id: 'clarendon', label: 'Clarendon', css: 'saturate(1.35) contrast(1.15) brightness(1.05)' },
  { id: 'vintage', label: 'Vintage', css: 'sepia(0.35) saturate(0.85) contrast(0.95) brightness(1.05)' },
  { id: 'cool', label: 'Cool', css: 'saturate(1.1) hue-rotate(-8deg) brightness(1.03) contrast(1.05)' },
  { id: 'warm', label: 'Warm', css: 'saturate(1.15) hue-rotate(8deg) brightness(1.04)' },
  { id: 'noir', label: 'Noir', css: 'grayscale(1) contrast(1.3) brightness(0.92)' },
];

export const DEFAULT_ADJUSTMENTS = { brightness: 100, contrast: 100, saturation: 100 };

// Builds the full CSS filter string for live preview (filter preset +
// user adjustment sliders layered on top) — used both for the on-screen
// preview and, indirectly, for the final canvas render below.
export function buildFilterString(presetId, adjustments) {
  const preset = FILTER_PRESETS.find((f) => f.id === presetId) || FILTER_PRESETS[0];
  const adj = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`;
  return preset.css === 'none' ? adj : `${preset.css} ${adj}`;
}

/**
 * Renders the edited image (crop rect + zoom/pan + filter + adjustments
 * + freehand drawing + text overlays) into a single flattened canvas
 * and resolves a Blob — this is the "baked in at publish time" step
 * that matches how FB/IG actually work: once posted, none of this can
 * be re-opened and re-edited, only the caption/metadata can.
 *
 * Strokes and text overlays are stored in coordinates NORMALIZED to
 * the visible frame (0-1, x left-to-right / y top-to-bottom) at the
 * moment they were drawn — since the frame always shows the current
 * crop/pan/zoom, those normalized coordinates map directly onto the
 * final output canvas at the same relative position, regardless of
 * output resolution. The one caveat: if crop/zoom/pan changes AFTER
 * something is drawn, the frame's visible content shifts under
 * already-placed strokes/text — same limitation most lightweight
 * editors have, which is why Draw/Text are the last two tabs.
 *
 * @param {HTMLImageElement} image - loaded source image
 * @param {{x:number,y:number,scale:number}} transform - pan (x/y in
 *   0-1 image-space) and zoom scale (1 = fit, >1 = zoomed in)
 * @param {string} aspect - 'original' | '1:1' | '4:5' | '16:9'
 * @param {string} presetId - one of FILTER_PRESETS ids
 * @param {{brightness:number,contrast:number,saturation:number}} adjustments
 * @param {{strokes:Array,texts:Array}} [overlays] - strokes: [{color,
 *   size, points:[{x,y}]}], texts: [{text,x,y,fontSize,color}] — all
 *   coordinates/sizes normalized 0-1 relative to the frame
 */
export async function renderEditedImage(image, transform, aspect, presetId, adjustments, overlays = null) {
  const naturalW = image.naturalWidth;
  const naturalH = image.naturalHeight;

  let targetRatio;
  if (aspect === '1:1') targetRatio = 1;
  else if (aspect === '4:5') targetRatio = 4 / 5;
  else if (aspect === '16:9') targetRatio = 16 / 9;
  else targetRatio = naturalW / naturalH; // 'original'

  // Largest crop rectangle (in source-image pixels) with the target
  // aspect ratio that still fits inside the source image.
  let cropW = naturalW;
  let cropH = naturalW / targetRatio;
  if (cropH > naturalH) {
    cropH = naturalH;
    cropW = naturalH * targetRatio;
  }

  // Zoom shrinks the crop window (scale > 1 = more zoomed in = smaller
  // window), then pan (x/y, each 0-1) slides that window around the
  // remaining travel range so it never goes outside the source image.
  const scale = Math.max(1, transform.scale || 1);
  cropW = cropW / scale;
  cropH = cropH / scale;
  const maxX = naturalW - cropW;
  const maxY = naturalH - cropH;
  const srcX = Math.min(Math.max(transform.x || 0, 0), 1) * maxX;
  const srcY = Math.min(Math.max(transform.y || 0, 0), 1) * maxY;

  const MAX_OUTPUT = 1600; // matches compressImage's longest-side cap
  const outScale = Math.min(1, MAX_OUTPUT / Math.max(cropW, cropH));
  const outW = Math.round(cropW * outScale);
  const outH = Math.round(cropH * outScale);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  ctx.filter = buildFilterString(presetId, adjustments);
  ctx.drawImage(image, srcX, srcY, cropW, cropH, 0, 0, outW, outH);

  // Overlays are drawn AFTER the photo filter, with filter reset to
  // 'none' first — a red drawn line should stay red even if the photo
  // underneath it is set to the B&W filter, exactly like FB/IG.
  if (overlays) {
    ctx.filter = 'none';

    for (const stroke of overlays.strokes || []) {
      if (!stroke.points || stroke.points.length < 2) continue;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = Math.max(1, stroke.size * outW);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x * outW, stroke.points[0].y * outH);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x * outW, stroke.points[i].y * outH);
      }
      ctx.stroke();
    }

    for (const t of overlays.texts || []) {
      if (!t.text || !t.text.trim()) continue;
      const px = Math.max(8, t.fontSize * outW);
      ctx.font = `700 ${px}px var(--font-body), Inter, sans-serif`;
      ctx.fillStyle = t.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // A soft shadow keeps text readable over busy photo backgrounds
      // without needing a background pill, matching IG's default text style.
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = px * 0.12;
      ctx.shadowOffsetY = px * 0.03;
      ctx.fillText(t.text, t.x * outW, t.y * outH);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  return blob;
}

const HEIC_MIME_TYPES = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'];

// iPhones default to saving photos as HEIC. Chrome, Firefox, and most
// Android webviews can't decode HEIC in an <img>/canvas at all — the
// image just silently fails to load, which from the editor's point of
// view looks like "nothing previews and Done stays disabled." Some
// devices/browsers also don't set a MIME type for HEIC files at all,
// so the extension is checked as a fallback.
function looksLikeHeic(file) {
  if (HEIC_MIME_TYPES.includes((file.type || '').toLowerCase())) return true;
  return /\.hei[cf]$/i.test(file.name || '');
}

// Converts a HEIC/HEIF file to a JPEG File client-side. Dynamically
// imported so the ~50kb decoder only loads for the people who actually
// need it (iPhone users sending unconverted photos), not on every page
// load. If conversion itself fails for any reason, the original file is
// returned as-is and loadImageElement below will surface a clear error
// rather than the app silently hanging.
async function convertHeicToJpeg(file) {
  try {
    const { default: heic2any } = await import('heic2any');
    const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
    const blob = Array.isArray(result) ? result[0] : result;
    return new File([blob], file.name.replace(/\.\w+$/i, '.jpg'), {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(
      "Could not open this image — your browser may not support this photo format (common with iPhone HEIC photos). Try 'Use original photo' below, or pick a different photo."
    ));
    img.src = URL.createObjectURL(file);
  });
}

export async function loadImageFromFile(file) {
  const source = looksLikeHeic(file) ? await convertHeicToJpeg(file) : file;
  return loadImageElement(source);
}
