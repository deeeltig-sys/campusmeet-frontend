import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { StatusesAPI } from '../api/client';
import CreateStatusModal from './CreateStatusModal';
import StatusViewer from './StatusViewer';

export default function StatusStrip() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [viewingIndex, setViewingIndex] = useState(null); // index into groups, or null

  function load() {
    StatusesAPI.list().then((data) => setGroups(Array.isArray(data) ? data : [])).catch(() => {});
  }
  useEffect(() => { load(); }, []);

  const myGroup = groups.find((g) => g.author.id === user?.id);
  const otherGroups = groups.filter((g) => g.author.id !== user?.id);

  return (
    <div style={{ display: 'flex', gap: 'var(--sp-3)', overflowX: 'auto', marginBottom: 'var(--sp-4)', paddingBottom: 4 }}>
      {/* Your status — tapping the ring opens the viewer if you have one,
          the + always opens the create flow regardless. */}
      <div style={{ flex: '0 0 auto', width: 64, textAlign: 'center' }}>
        <button
          type="button"
          onClick={() => (myGroup ? setViewingIndex(groups.indexOf(myGroup)) : setShowCreate(true))}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', position: 'relative' }}
        >
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            border: myGroup ? `2px solid ${myGroup.all_viewed ? 'var(--line)' : 'var(--gold-bright)'}` : '2px dashed var(--line)',
            padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div className="avatar-circle" style={{ width: '100%', height: '100%' }}>
              {user?.avatar_url ? <img src={user.avatar_url} alt="" /> : (user?.full_name?.charAt(0) || '?')}
            </div>
          </div>
          <span
            role="button"
            aria-label="Add status"
            onClick={(e) => { e.stopPropagation(); setShowCreate(true); }}
            style={{
              position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: '50%',
              background: 'var(--maroon)', border: '2px solid var(--ivory)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, lineHeight: 1,
            }}
          >
            +
          </span>
        </button>
        <p style={{ fontSize: '0.625rem', marginTop: 4, color: 'var(--ink-soft)' }}>Your status</p>
      </div>

      {otherGroups.map((g) => (
        <div key={g.author.id} style={{ flex: '0 0 auto', width: 64, textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => setViewingIndex(groups.indexOf(g))}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              border: `2px solid ${g.all_viewed ? 'var(--line)' : 'var(--gold-bright)'}`,
              padding: 2,
            }}>
              <div className="avatar-circle" style={{ width: '100%', height: '100%' }}>
                {g.author.avatar_url ? <img src={g.author.avatar_url} alt="" /> : (g.author.full_name?.charAt(0) || '?')}
              </div>
            </div>
          </button>
          <p style={{
            fontSize: '0.625rem', marginTop: 4, color: 'var(--ink-soft)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {g.author.full_name?.split(' ')[0] || 'Student'}
          </p>
        </div>
      ))}

      {showCreate && (
        <CreateStatusModal
          onClose={() => setShowCreate(false)}
          onPosted={() => { setShowCreate(false); load(); }}
        />
      )}

      {viewingIndex !== null && (
        <StatusViewer
          groups={groups}
          startIndex={viewingIndex}
          onClose={() => { setViewingIndex(null); load(); }}
        />
      )}
    </div>
  );
}
