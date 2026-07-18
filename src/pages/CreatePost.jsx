import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PostsAPI } from '../api/client';
import BackHeader from '../components/BackHeader';
import { compressImage } from '../utils/compressImage';

// Raw pre-compression cap — generous, since compression brings the final
// upload size down regardless. This just guards against absurd files
// (e.g. a 40MB RAW export) before we spend time processing them.
const MAX_RAW_IMAGE_BYTES = 20 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function CreatePost() {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploadStage, setUploadStage] = useState('');
  const [optimizing, setOptimizing] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPEG, PNG, or WEBP images are supported.');
      return;
    }
    if (file.size > MAX_RAW_IMAGE_BYTES) {
      setError('Image is too large. Please pick a smaller photo.');
      return;
    }

    setError('');
    setOptimizing(true);
    try {
      const compressed = await compressImage(file);
      setImageFile(compressed);
      setImagePreview(URL.createObjectURL(compressed));
    } catch {
      // If compression fails for any reason, fall back to the original file
      // rather than blocking the post — the backend's 6MB cap is still the
      // real safety net.
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } finally {
      setOptimizing(false);
    }
  }

  function removeImage() {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim() && !imageFile) return;
    setError('');
    setBusy(true);
    try {
      let image_url;
      if (imageFile) {
        setUploadStage('Uploading image…');
        image_url = await PostsAPI.uploadImage(imageFile);
      }
      setUploadStage('Publishing…');
      await PostsAPI.create({ content: content.trim(), image_url });
      navigate('/feed');
    } catch (err) {
      setError(err.message || 'Could not publish your post.');
    } finally {
      setBusy(false);
      setUploadStage('');
    }
  }

  return (
    <div className="screen">
      <BackHeader eyebrow="New post" title="Share with campus" fallback="/feed" />

      {error && <div className="banner-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="content">What's on your mind?</label>
          <textarea
            id="content"
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tell campus what's going on…"
            style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }}
          />
        </div>

        <div className="image-picker">
          {imagePreview ? (
            <div className="image-preview">
              <img src={imagePreview} alt="Selected upload preview" />
              <button
                type="button"
                className="image-preview-remove"
                onClick={removeImage}
                aria-label="Remove image"
              >
                &times;
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="image-picker-trigger"
              onClick={() => fileInputRef.current?.click()}
              disabled={optimizing}
            >
              {optimizing ? (
                'Optimizing image…'
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <rect x="3" y="5" width="18" height="14" rx="2" stroke="var(--maroon)" strokeWidth="1.6" />
                    <circle cx="8.5" cy="10" r="1.6" fill="var(--gold)" />
                    <path d="M4 17l5-5 4 4 3-3 4 4" stroke="var(--maroon)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Add a photo
                </>
              )}
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={busy || optimizing || (!content.trim() && !imageFile)}
        >
          {busy ? uploadStage || 'Publishing…' : 'Publish'}
        </button>
      </form>
    </div>
  );
}
