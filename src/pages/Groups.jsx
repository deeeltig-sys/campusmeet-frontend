import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GroupsAPI } from '../api/client';
import BackHeader from '../components/BackHeader';
import VerifiedBadge from '../components/VerifiedBadge';

function GroupRow({ group, onJoinToggle }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function handleJoin(e) {
    e.stopPropagation();
    setBusy(true);
    try {
      await onJoinToggle(group);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => navigate(`/groups/${group.id}`)}
      className="card"
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left', marginBottom: 'var(--sp-2)' }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 12, flexShrink: 0, overflow: 'hidden',
        background: 'var(--maroon-light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {group.avatar_url ? (
          <img src={group.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontFamily: 'var(--font-display)', color: 'var(--maroon-deep)', fontSize: '1.2rem' }}>
            {group.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ fontSize: 'var(--fs-sm)' }}>{group.name}</strong>
        <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', margin: '2px 0 0' }}>
          {group.member_count} member{group.member_count === 1 ? '' : 's'}
          {group.privacy === 'private' && ' · Private'}
        </p>
      </div>
      {!group.is_member && (
        <button
          type="button"
          onClick={handleJoin}
          disabled={busy || group.privacy === 'private'}
          style={{
            fontSize: 'var(--fs-xs)', fontWeight: 600, padding: '6px 14px', borderRadius: 999,
            border: 'none', background: 'var(--maroon)', color: '#fff',
            cursor: group.privacy === 'private' ? 'default' : 'pointer', opacity: group.privacy === 'private' ? 0.5 : 1,
            flexShrink: 0,
          }}
        >
          Join
        </button>
      )}
    </button>
  );
}

export default function Groups() {
  const [tab, setTab] = useState('discover'); // 'discover' | 'mine'
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = tab === 'mine' ? await GroupsAPI.mine() : await GroupsAPI.discover();
      setGroups(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load groups.');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  async function handleJoinToggle(group) {
    setGroups((prev) => prev.map((g) => (g.id === group.id ? { ...g, is_member: true, member_count: g.member_count + 1 } : g)));
    try {
      await GroupsAPI.join(group.id);
    } catch {
      setGroups((prev) => prev.map((g) => (g.id === group.id ? { ...g, is_member: false, member_count: g.member_count - 1 } : g)));
    }
  }

  return (
    <div className="screen">
      <BackHeader fallback="/feed" eyebrow="Communities" title="Groups" />

      <div style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
        <button
          type="button"
          onClick={() => setTab('discover')}
          className={tab === 'discover' ? 'btn btn-primary' : 'btn'}
          style={{ fontSize: 'var(--fs-sm)', padding: '6px 14px' }}
        >
          Discover
        </button>
        <button
          type="button"
          onClick={() => setTab('mine')}
          className={tab === 'mine' ? 'btn btn-primary' : 'btn'}
          style={{ fontSize: 'var(--fs-sm)', padding: '6px 14px' }}
        >
          My groups
        </button>
        <button
          type="button"
          onClick={() => navigate('/groups/create')}
          className="btn"
          style={{ fontSize: 'var(--fs-sm)', padding: '6px 14px', marginLeft: 'auto' }}
        >
          + Create
        </button>
      </div>

      {error && <div className="banner-error">{error}</div>}
      {loading && <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>}

      {!loading && !error && groups.length === 0 && (
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-soft)' }}>
            {tab === 'mine' ? "You haven't joined or created any groups yet." : 'No groups yet — be the first to start one.'}
          </p>
        </div>
      )}

      {!loading && groups.map((group) => (
        <GroupRow key={group.id} group={group} onJoinToggle={handleJoinToggle} />
      ))}
    </div>
  );
}
