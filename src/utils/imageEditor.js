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
 * Renders the edited image (crop rect + zoom/pan + filter + adjustments)
 * into a single flattened canvas and resolves a Blob — this is the
 * "baked in at publish time" step that matches how FB/IG actually work:
 * once posted, the filter/crop can't be re-opened and re-edited, only
 * the caption/metadata can.
 *
 * @param {HTMLImageElement} image - loaded source image
 * @param {{x:number,y:number,scale:number}} transform - pan (x/y in
 *   0-1 image-space) and zoom scale (1 = fit, >1 = zoomed in)
 * @param {string} aspect - 'original' | '1:1' | '4:5' | '16:9'
 * @param {string} presetId - one of FILTER_PRESETS ids
 * @param {{brightness:number,contrast:number,saturation:number}} adjustments
 */
export async function renderEditedImage(image, transform, aspect, presetId, adjustments) {
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

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  return blob;
}

export function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read this image.'));
    img.src = URL.createObjectURL(file);
  });
}
