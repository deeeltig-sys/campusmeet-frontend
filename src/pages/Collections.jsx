import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CollectionsAPI } from '../api/client';
import BackHeader from '../components/BackHeader';

export default function Collections() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [busyId, setBusyId] = useState(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setCollections(await CollectionsAPI.list());
    } catch (err) {
      setError(err.message || 'Could not load your collections.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    setCreating(true);
    setError('');
    try {
      const created = await CollectionsAPI.create(title);
      setCollections((prev) => [...prev, created]);
      setNewTitle('');
    } catch (err) {
      setError(err.message || 'Could not create that collection.');
    } finally {
      setCreating(false);
    }
  }

  async function handleRename(collection) {
    const title = window.prompt('Rename collection', collection.title);
    if (!title || !title.trim() || title.trim() === collection.title) return;
    setBusyId(collection.id);
    try {
      const updated = await CollectionsAPI.rename(collection.id, title.trim());
      setCollections((prev) => prev.map((c) => (c.id === collection.id ? { ...c, title: updated.title } : c)));
    } catch (err) {
      setError(err.message || 'Could not rename that collection.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(collection) {
    if (!window.confirm(`Delete "${collection.title}"? Saved posts inside move back to Uncategorized — nothing gets unsaved.`)) return;
    setBusyId(collection.id);
    try {
      await CollectionsAPI.delete(collection.id);
      setCollections((prev) => prev.filter((c) => c.id !== collection.id));
    } catch (err) {
      setError(err.message || 'Could not delete that collection.');
      setBusyId(null);
    }
  }

  return (
    <div className="screen">
      <BackHeader fallback="/profile" eyebrow="Saved" title="Collections" />

      {error && <div className="banner-error">{error}</div>}

      <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, marginBottom: 'var(--sp-4)' }}>
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New collection name"
          maxLength={60}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary" disabled={creating || !newTitle.trim()} style={{ fontSize: 'var(--fs-sm)', padding: '8px 16px' }}>
          {creating ? 'Adding…' : 'Create'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => navigate('/collections/none')}
        className="card"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', border: 'none', cursor: 'pointer', marginBottom: 'var(--sp-2)' }}
      >
        <span className="name-shine" style={{ fontSize: 'var(--fs-sm)', fontWeight: 600 }}>All Saved</span>
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)' }}>Everything you've bookmarked</span>
      </button>

      {loading && <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>}

      {!loading && collections.length === 0 && (
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-soft)' }}>No collections yet — create one above to start organizing your saves.</p>
        </div>
      )}

      {!loading && collections.map((c) => (
        <div key={c.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
          <button
            type="button"
            onClick={() => navigate(`/collections/${c.id}`)}
            style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
          >
            <span className="name-shine" style={{ fontSize: 'var(--fs-sm)', fontWeight: 600 }}>{c.title}</span>
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)' }}>{c.post_count} saved</span>
          </button>
          <button type="button" onClick={() => handleRename(c)} disabled={busyId === c.id} style={{ background: 'none', border: 'none', color: 'var(--ink-soft)', fontSize: 'var(--fs-xs)', cursor: 'pointer' }}>
            Rename
          </button>
          <button type="button" onClick={() => handleDelete(c)} disabled={busyId === c.id} style={{ background: 'none', border: 'none', color: '#b3261e', fontSize: 'var(--fs-xs)', cursor: 'pointer' }}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
