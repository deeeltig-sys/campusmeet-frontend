// Resizes + compresses an image client-side before upload, so a large
// phone photo doesn't sit near the 6MB cap or bloat storage/bandwidth.
export async function compressImage(file, {
  maxDimension = 1600,   // longest side, px — plenty for feed display
  quality = 0.8,          // JPEG quality, 0-1
  mimeType = 'image/jpeg',
} = {}) {
  if (!file.type.startsWith('image/')) return file;

  const imageBitmap = await createImageBitmap(file);
  let { width, height } = imageBitmap;

  if (width > maxDimension || height > maxDimension) {
    const scale = maxDimension / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(imageBitmap, 0, 0, width, height);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, mimeType, quality)
  );

  // Fallback: if compression somehow produced something bigger, keep original
  if (!blob || blob.size >= file.size) return file;

  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
    type: mimeType,
    lastModified: Date.now(),
  });
}
