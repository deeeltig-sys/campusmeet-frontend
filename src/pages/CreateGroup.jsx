import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GroupsAPI } from '../api/client';
import BackHeader from '../components/BackHeader';

export default function CreateGroup() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError('Group name must be at least 2 characters.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const group = await GroupsAPI.create({
        name: name.trim(),
        description: description.trim() || undefined,
        privacy,
      });
      navigate(`/groups/${group.id}`);
    } catch (err) {
      setError(err.message || "That group wasn't created. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <BackHeader eyebrow="New group" title="Start a community" fallback="/groups" />

      {error && <div className="banner-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="name">Group name</label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Level 100 IT Class" />
        </div>

        <div className="field">
          <label htmlFor="description">Description (optional)</label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            placeholder="What's this group about?"
            style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }}
          />
        </div>

        <div className="field">
          <label>Privacy</label>
          <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
            <button
              type="button"
              onClick={() => setPrivacy('public')}
              className={privacy === 'public' ? 'btn btn-primary' : 'btn'}
              style={{ fontSize: 'var(--fs-sm)', padding: '6px 14px' }}
            >
              Public
            </button>
            <button
              type="button"
              onClick={() => setPrivacy('private')}
              className={privacy === 'private' ? 'btn btn-primary' : 'btn'}
              style={{ fontSize: 'var(--fs-sm)', padding: '6px 14px' }}
            >
              Private
            </button>
          </div>
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', marginTop: 6 }}>
            {privacy === 'public'
              ? 'Anyone can find and join this group.'
              : 'Only people an admin adds can see or join this group.'}
          </p>
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={busy || name.trim().length < 2}>
          {busy ? 'Creating…' : 'Create group'}
        </button>
      </form>
    </div>
  );
}
