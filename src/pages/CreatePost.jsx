import { useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const groupId = location.state?.groupId;
  const groupName = location.state?.groupName;

  function togglePoll() {
    setShowPoll((v) => !v);
    if (imageFile) removeImage();
  }

  function updatePollOption(index, value) {
    setPollOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function addPollOption() {
    setPollOptions((prev) => (prev.length < 4 ? [...prev, ''] : prev));
  }

  function removePollOption(index) {
    setPollOptions((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== index) : prev));
  }

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
    if (showPoll) {
      const cleaned = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (!content.trim()) {
        setError('Write a question for your poll.');
        return;
      }
      if (cleaned.length < 2) {
        setError('A poll needs at least 2 options.');
        return;
      }
    } else if (!content.trim() && !imageFile) {
      return;
    }
    setError('');
    setBusy(true);
    try {
      let image_url;
      if (imageFile && !showPoll) {
        setUploadStage('Uploading image…');
        image_url = await PostsAPI.uploadImage(imageFile);
      }
      setUploadStage('Publishing…');
      const payload = { content: content.trim(), image_url };
      if (showPoll) {
        payload.poll_options = pollOptions.map((o) => o.trim()).filter(Boolean);
      }
      if (groupId) {
        payload.group_id = groupId;
      }
      await PostsAPI.create(payload);
      navigate(groupId ? `/groups/${groupId}` : '/feed');
    } catch (err) {
      setError(err.message || 'Could not publish your post.');
    } finally {
      setBusy(false);
      setUploadStage('');
    }
  }

  return (
    <div className="screen">
      <BackHeader
        eyebrow={groupName ? `Posting in ${groupName}` : 'New post'}
        title={groupName ? groupName : 'Share with campus'}
        fallback={groupId ? `/groups/${groupId}` : '/feed'}
      />

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

        <div style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
          <button
            type="button"
            onClick={togglePoll}
            className={showPoll ? 'btn btn-primary' : 'btn'}
            style={{ fontSize: 'var(--fs-sm)', padding: '6px 14px' }}
          >
            {showPoll ? 'Remove poll' : 'Add a poll'}
          </button>
        </div>

        {showPoll && (
          <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pollOptions.map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => updatePollOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  maxLength={80}
                  style={{ flex: 1 }}
                />
                {pollOptions.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removePollOption(i)}
                    aria-label="Remove option"
                    style={{ background: 'none', border: 'none', color: 'var(--ink-soft)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 6px' }}
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
            {pollOptions.length < 4 && (
              <button
                type="button"
                onClick={addPollOption}
                style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--maroon)', fontWeight: 600, fontSize: 'var(--fs-sm)', cursor: 'pointer', padding: 0 }}
              >
                + Add option
              </button>
            )}
          </div>
        )}

        <div className="image-picker" style={{ opacity: showPoll ? 0.4 : 1, pointerEvents: showPoll ? 'none' : 'auto' }}>
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
          disabled={
            busy || optimizing ||
            (showPoll
              ? !content.trim() || pollOptions.map((o) => o.trim()).filter(Boolean).length < 2
              : !content.trim() && !imageFile)
          }
        >
          {busy ? uploadStage || 'Publishing…' : showPoll ? 'Publish poll' : 'Publish'}
        </button>
      </form>
    </div>
  );
}
