import { compressImage } from './compressImage';
import { looksLikeHeic, convertHeicToJpeg } from './imageEditor';

// Generous ceiling for non-image chat attachments (documents, audio
// files). Images don't need this check — compressImage below already
// brings them well under this regardless of the original size.
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

/**
 * Runs a file picked from the chat composer's attach menu through the
 * right prep before it's uploaded:
 *
 *  - Images (including HEIC/HEIF, which iPhones save by default and
 *    which most Android/desktop browsers can't decode into an <img>
 *    at all) are converted to JPEG first, then compressed — the exact
 *    same fix already applied to post photos, so a chat photo someone
 *    sends is guaranteed to actually render on the other end instead
 *    of showing as a broken image.
 *  - Everything else (documents, audio files) is left untouched but
 *    checked against a size ceiling up front, so an oversized pick
 *    fails fast with a clear message instead of hanging on a doomed
 *    upload with no feedback.
 */
export async function prepareOutgoingAttachment(file) {
  const isImage = file.type.startsWith('image/') || looksLikeHeic(file);
  if (!isImage) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      const capMb = Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024));
      throw new Error(`That file is too large to send (max ${capMb}MB).`);
    }
    return file;
  }
  const heicSafe = looksLikeHeic(file) ? await convertHeicToJpeg(file) : file;
  return compressImage(heicSafe);
}
