import { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PostsAPI, UsersAPI } from '../api/client';
import BackHeader from '../components/BackHeader';
import { compressImage } from '../utils/compressImage';
import ImageEditor from '../components/ImageEditor';

// Raw pre-compression cap — generous, since compression brings the final
// upload size down regardless. This just guards against absurd files
// (e.g. a 40MB RAW export) before we spend time processing them.
const MAX_RAW_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_IMAGES = 5;

export default function CreatePost() {
  const [content, setContent] = useState('');
  // Each entry: { file, previewUrl }. Order in this array is the
  // carousel order a viewer will swipe through, same as IG.
  const [images, setImages] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploadStage, setUploadStage] = useState('');
  const [optimizing, setOptimizing] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [audience, setAudience] = useState('public'); // 'public' | 'friends'
  const [editingFile, setEditingFile] = useState(null); // raw File pending crop/filter/adjust
  const [editingIndex, setEditingIndex] = useState(null); // null = adding new photo; a number = re-editing that slot
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const groupId = location.state?.groupId;
  const groupName = location.state?.groupName;

  // ---- @mention autocomplete ----
  // No @username handle system in this schema — a mention is an
  // explicit {id, full_name} the person picked from this dropdown,
  // not something parsed out of free-typed text afterward. That's
  // also why matching is done here at selection time rather than
  // trying to regex a name pattern out of the caption later.
  const [mentionQuery, setMentionQuery] = useState(null); // null = dropdown closed
  const [mentionStart, setMentionStart] = useState(null); // index of the '@' that opened it
  const [mentionResults, setMentionResults] = useState([]);
  const [taggedUsers, setTaggedUsers] = useState([]); // [{id, full_name}], in the order picked

  useEffect(() => {
    if (mentionQuery === null || mentionQuery.length < 2) {
      setMentionResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      UsersAPI.search(mentionQuery)
        .then((data) => { if (!cancelled) setMentionResults(Array.isArray(data) ? data.slice(0, 6) : []); })
        .catch(() => { if (!cancelled) setMentionResults([]); });
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [mentionQuery]);

  function handleContentChange(e) {
    const value = e.target.value;
    const cursor = e.target.selectionStart;
    setContent(value);

    // Find the nearest unfinished "@token" ending exactly at the
    // cursor — i.e. an '@' with no whitespace between it and where
    // the caret currently is.
    const upToCursor = value.slice(0, cursor);
    const at = upToCursor.lastIndexOf('@');
    if (at === -1 || /\s/.test(upToCursor.slice(at + 1))) {
      setMentionQuery(null);
      setMentionStart(null);
      return;
    }
    const precedingChar = at > 0 ? value[at - 1] : ' ';
    if (!/\s/.test(precedingChar)) {
      // '@' stuck to the middle of another word (an email-ish thing) —
      // not a mention trigger.
      setMentionQuery(null);
      setMentionStart(null);
      return;
    }
    setMentionStart(at);
    setMentionQuery(upToCursor.slice(at + 1));
  }

  function pickMention(user) {
    const textarea = textareaRef.current;
    const cursor = textarea ? textarea.selectionStart : content.length;
    const before = content.slice(0, mentionStart);
    const after = content.slice(cursor);
    const inserted = `@${user.full_name} `;
    const nextContent = `${before}${inserted}${after}`;
    setContent(nextContent);
    setTaggedUsers((prev) => (prev.some((u) => u.id === user.id) ? prev : [...prev, { id: user.id, full_name: user.full_name }]));
    setMentionQuery(null);
    setMentionStart(null);
    setMentionResults([]);

    requestAnimationFrame(() => {
      if (!textarea) return;
      const newCursor = before.length + inserted.length;
      textarea.focus();
      textarea.setSelectionRange(newCursor, newCursor);
    });
  }

  function togglePoll() {
    setShowPoll((v) => !v);
    if (images.length > 0) clearAllImages();
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

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please pick an image file.');
      return;
    }
    if (file.size > MAX_RAW_IMAGE_BYTES) {
      setError('Image is too large. Please pick a smaller photo.');
      return;
    }

    setError('');
    setEditingIndex(null); // adding a new slot, not re-editing one
    // Opens the crop/filter/adjust editor before anything gets
    // uploaded — matches FB/IG, where the edit stack runs BEFORE
    // compression/upload, not after.
    setEditingFile(file);
  }

  function openEditFor(index) {
    setEditingIndex(index);
    setEditingFile(images[index].file);
  }

  async function handleEditorDone(editedFile) {
    const targetIndex = editingIndex;
    setEditingFile(null);
    setEditingIndex(null);
    setOptimizing(true);
    try {
      // The editor already rendered to a size-capped JPEG; this pass
      // just squeezes it a little further the same way any picked
      // photo does, so filtered posts aren't heavier than plain ones.
      const compressed = await compressImage(editedFile);
      const entry = { file: compressed, previewUrl: URL.createObjectURL(compressed) };
      setImages((prev) => {
        if (targetIndex !== null) {
          const next = [...prev];
          if (next[targetIndex]) URL.revokeObjectURL(next[targetIndex].previewUrl);
          next[targetIndex] = entry;
          return next;
        }
        if (prev.length >= MAX_IMAGES) return prev;
        return [...prev, entry];
      });
    } catch {
      const entry = { file: editedFile, previewUrl: URL.createObjectURL(editedFile) };
      setImages((prev) => {
        if (targetIndex !== null) {
          const next = [...prev];
          if (next[targetIndex]) URL.revokeObjectURL(next[targetIndex].previewUrl);
          next[targetIndex] = entry;
          return next;
        }
        if (prev.length >= MAX_IMAGES) return prev;
        return [...prev, entry];
      });
    } finally {
      setOptimizing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removeImageAt(index) {
    setImages((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  }

  function moveImage(index, direction) {
    setImages((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  function clearAllImages() {
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const validMentions = useCallback(
    () => taggedUsers.filter((u) => content.includes(`@${u.full_name}`)),
    [taggedUsers, content]
  );

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
    } else if (!content.trim() && images.length === 0) {
      return;
    }
    setError('');
    setBusy(true);
    try {
      let image_urls;
      if (images.length > 0 && !showPoll) {
        setUploadStage(images.length > 1 ? `Uploading photo 1 of ${images.length}…` : 'Uploading image…');
        image_urls = [];
        for (let i = 0; i < images.length; i++) {
          if (images.length > 1) setUploadStage(`Uploading photo ${i + 1} of ${images.length}…`);
          const url = await PostsAPI.uploadImage(images[i].file);
          image_urls.push(url);
        }
      }
      setUploadStage('Publishing…');
      const payload = { content: content.trim(), audience };
      if (image_urls) payload.image_urls = image_urls;
      if (showPoll) {
        payload.poll_options = pollOptions.map((o) => o.trim()).filter(Boolean);
      }
      if (groupId) {
        payload.group_id = groupId;
      }
      const mentions = validMentions();
      if (mentions.length > 0) {
        payload.mentioned_user_ids = mentions.map((u) => u.id);
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
        <div className="field" style={{ position: 'relative' }}>
          <label htmlFor="content">What's on your mind?</label>
          <textarea
            ref={textareaRef}
            id="content"
            rows={5}
            value={content}
            onChange={handleContentChange}
            placeholder="Tell campus what's going on… type @ to tag someone"
            style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }}
          />

          {mentionQuery !== null && mentionResults.length > 0 && (
            <div
              className="card"
              style={{
                position: 'absolute', left: 0, right: 0, zIndex: 10, marginTop: -8, padding: 6,
                maxHeight: 220, overflowY: 'auto', boxShadow: 'var(--shadow-card)',
              }}
            >
              {mentionResults.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => pickMention(u)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%', border: 'none',
                    background: 'none', textAlign: 'left', cursor: 'pointer', padding: '6px 8px', borderRadius: 8,
                  }}
                >
                  <div className="avatar-circle" style={{ width: 26, height: 26, fontSize: '0.7rem' }}>
                    {u.avatar_url ? <img src={u.avatar_url} alt="" /> : (u.full_name ? u.full_name.charAt(0) : '?')}
                  </div>
                  <span style={{ fontSize: 'var(--fs-sm)' }}>{u.full_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={togglePoll}
            className={showPoll ? 'btn btn-primary' : 'btn'}
            style={{ fontSize: 'var(--fs-sm)', padding: '6px 14px' }}
          >
            {showPoll ? 'Remove poll' : 'Add a poll'}
          </button>

          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', alignItems: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {audience === 'friends' ? (
                <path d="M9 12a3 3 0 100-6 3 3 0 000 6zM3 20c0-3 2.5-5.5 6-5.5s6 2.5 6 5.5M16 8a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM14.5 14c2.8.4 5.5 2.4 5.5 6" stroke="var(--maroon)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <>
                  <circle cx="12" cy="12" r="9" stroke="var(--ink-soft)" strokeWidth="1.6" />
                  <path d="M3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3z" stroke="var(--ink-soft)" strokeWidth="1.4" />
                </>
              )}
            </svg>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              style={{
                fontSize: 'var(--fs-sm)', border: '1px solid var(--line)', borderRadius: 999,
                padding: '5px 10px', background: '#fff', color: 'var(--ink)', cursor: 'pointer',
              }}
              aria-label="Who can see this post"
            >
              <option value="public">Public</option>
              <option value="friends">Friends</option>
            </select>
          </div>
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
          {images.length > 0 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 8 }}>
              {images.map((img, i) => (
                <div key={img.previewUrl} className="image-preview" style={{ position: 'relative', flexShrink: 0, width: 96, height: 96 }}>
                  <img src={img.previewUrl} alt={`Selected photo ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />

                  {images.length > 1 && (
                    <span style={{
                      position: 'absolute', top: 4, left: 4, background: 'rgba(0,0,0,0.6)', color: '#fff',
                      fontSize: '0.6rem', fontFamily: 'var(--font-mono)', borderRadius: 999, padding: '1px 6px',
                    }}>
                      {i + 1}
                    </span>
                  )}

                  <button
                    type="button"
                    className="image-preview-remove"
                    onClick={() => removeImageAt(i)}
                    aria-label={`Remove photo ${i + 1}`}
                    style={{ position: 'absolute', top: 4, right: 4 }}
                  >
                    &times;
                  </button>

                  {images.length > 1 && (
                    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, display: 'flex', justifyContent: 'space-between', transform: 'translateY(-50%)', padding: '0 2px' }}>
                      <button
                        type="button"
                        onClick={() => moveImage(i, -1)}
                        disabled={i === 0}
                        aria-label={`Move photo ${i + 1} earlier`}
                        style={{
                          width: 20, height: 20, borderRadius: '50%', border: 'none', cursor: i === 0 ? 'default' : 'pointer',
                          background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: '0.7rem', opacity: i === 0 ? 0.3 : 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                        }}
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(i, 1)}
                        disabled={i === images.length - 1}
                        aria-label={`Move photo ${i + 1} later`}
                        style={{
                          width: 20, height: 20, borderRadius: '50%', border: 'none', cursor: i === images.length - 1 ? 'default' : 'pointer',
                          background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: '0.7rem', opacity: i === images.length - 1 ? 0.3 : 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                        }}
                      >
                        ›
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => openEditFor(i)}
                    className="overlay-pill-btn"
                    style={{
                      position: 'absolute', bottom: 4, left: 4, right: 4, padding: '3px 6px', borderRadius: 999,
                      background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', fontSize: '0.6rem', cursor: 'pointer',
                    }}
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          )}

          {images.length < MAX_IMAGES ? (
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
                  {images.length > 0 ? `Add another photo (${images.length}/${MAX_IMAGES})` : 'Add a photo'}
                </>
              )}
            </button>
          ) : (
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', textAlign: 'center', margin: '4px 0' }}>
              Maximum {MAX_IMAGES} photos per post.
            </p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
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
              : !content.trim() && images.length === 0)
          }
        >
          {busy ? uploadStage || 'Publishing…' : showPoll ? 'Publish poll' : 'Publish'}
        </button>
      </form>

      {editingFile && (
        <ImageEditor
          file={editingFile}
          onCancel={() => { setEditingFile(null); setEditingIndex(null); }}
          onDone={handleEditorDone}
        />
      )}
    </div>
  );
}
