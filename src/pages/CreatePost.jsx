import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PostsAPI } from '../api/client';
import BackHeader from '../components/BackHeader';

export default function CreatePost() {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setError('');
    setBusy(true);
    try {
      await PostsAPI.create({ content: content.trim() });
      navigate('/feed');
    } catch (err) {
      setError(err.message || 'Could not publish your post.');
    } finally {
      setBusy(false);
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
            rows={6}
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tell campus what's going on…"
            style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }}
          />
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy || !content.trim()}>
          {busy ? 'Publishing…' : 'Publish'}
        </button>
      </form>
    </div>
  );
}
