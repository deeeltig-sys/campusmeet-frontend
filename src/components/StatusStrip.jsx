import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { StatusesAPI } from '../api/client';
import CreateStatusModal from './CreateStatusModal';
import StatusViewer from './StatusViewer';

const CARD_WIDTH = 108;
const CARD_HEIGHT = 176;
const DESKTOP_CARD_SIZE = 150; // square card size once we hit desktop widths

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : false
  );
  useEffect(() => {
    function onResize() { setIsDesktop(window.innerWidth >= 1024); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isDesktop;
}

// Facebook's actual story bar is wide rectangular cards showing a real
// preview of the content — not small circular avatar rings the way
// Instagram does it. This is that shape: each card shows the most
// recent status's real image or colored-text background as the full
// card face, with a small avatar + name overlaid, so the strip itself
// previews what's actually in each story before you tap it.
export default function StatusStrip() {
  const { user } = useAuth();
  const isDesktop = useIsDesktop();
  const cardWidth = isDesktop ? DESKTOP_CARD_SIZE : CARD_WIDTH;
  const cardHeight = isDesktop ? DESKTOP_CARD_SIZE : CARD_HEIGHT;
  const [groups, setGroups] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [viewingIndex, setViewingIndex] = useState(null); // index into groups, or null

  function load() {
    StatusesAPI.list().then((data) => setGroups(Array.isArray(data) ? data : [])).catch(() => {});
  }
  useEffect(() => { load(); }, []);

  const myGroup = groups.find((g) => g.author.id === user?.id);
  const otherGroups = groups.filter((g) => g.author.id !== user?.id);

  // The most recent status in a group is what the card previews —
  // list_statuses (routes/statuses.py) already returns each group's
  // statuses newest-first.
  function latestOf(group) {
    return group?.statuses?.[0] || null;
  }

  function CardShell({ children, onClick, ring }) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          flex: '0 0 auto', width: cardWidth, height: cardHeight, borderRadius: 14,
          position: 'relative', overflow: 'hidden', border: ring ? `3px solid ${ring}` : '1px solid var(--line)',
          padding: 0, cursor: 'pointer', background: 'var(--ivory-dim)',
        }}
      >
        {children}
      </button>
    );
  }

  function PreviewBackground({ status }) {
    if (!status) return null;
    if (status.content_type === 'image' && status.image_url) {
      return (
        <img
          src={status.image_url} alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      );
    }
    if (status.content_type === 'post' && status.shared_post) {
      if (status.shared_post.image_url) {
        return (
          <img
            src={status.shared_post.image_url} alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        );
      }
      return (
        <div style={{
          position: 'absolute', inset: 0, background: 'var(--maroon)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10,
        }}>
          <span style={{
            color: '#fff', fontSize: '0.7rem', fontWeight: 600, textAlign: 'center',
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical',
          }}>
            {status.shared_post.content}
          </span>
        </div>
      );
    }
    return (
      <div style={{
        position: 'absolute', inset: 0, background: status.background_color || 'var(--maroon)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10,
      }}>
        <span style={{
          color: '#fff', fontSize: '0.7rem', fontWeight: 600, textAlign: 'center',
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical',
        }}>
          {status.text_content}
        </span>
      </div>
    );
  }

  function NameLabel({ name }) {
    return (
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, padding: '18px 8px 8px',
        background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.65))',
      }}>
        <span style={{
          color: '#fff', fontSize: '0.7rem', fontWeight: 600, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
        }}>
          {name}
        </span>
      </div>
    );
  }

  const myLatest = latestOf(myGroup);

  return (
    <div style={{ display: 'flex', gap: 'var(--sp-2)', overflowX: 'auto', marginBottom: 'var(--sp-4)', paddingBottom: 4 }}>
      {/* Your status — no status yet: mirrors Facebook's "Create story"
          card exactly (your own photo up top, a plain bottom bar with
          a bold + and a label). Have a status already: show it like
          everyone else's card, with a small "+" badge on the avatar so
          adding another is still one tap away. */}
      <CardShell onClick={() => (myGroup ? setViewingIndex(groups.indexOf(myGroup)) : setShowCreate(true))} ring={null}>
        {myGroup ? (
          <>
            <PreviewBackground status={myLatest} />
            <div style={{
              position: 'absolute', top: 8, left: 8, width: 34, height: 34, borderRadius: '50%',
              border: `2px solid ${myGroup.all_viewed ? '#fff' : 'var(--gold-bright)'}`, padding: 2, background: '#fff',
            }}>
              <div className="avatar-circle" style={{ width: '100%', height: '100%' }}>
                {user?.avatar_url ? <img src={user.avatar_url} alt="" /> : (user?.full_name?.charAt(0) || '?')}
              </div>
            </div>
            <span
              role="button"
              aria-label="Add another status"
              onClick={(e) => { e.stopPropagation(); setShowCreate(true); }}
              style={{
                position: 'absolute', top: 34, left: 32, width: 18, height: 18, borderRadius: '50%',
                background: 'var(--maroon)', border: '2px solid #fff', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, lineHeight: 1,
              }}
            >
              +
            </span>
            <NameLabel name="Your story" />
          </>
        ) : (
          <>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '72%', background: 'var(--maroon-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="avatar-circle" style={{ width: 52, height: 52 }}>
                {user?.avatar_url ? <img src={user.avatar_url} alt="" /> : (user?.full_name?.charAt(0) || '?')}
              </div>
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '28%', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <span style={{
                width: 26, height: 26, borderRadius: '50%', background: 'var(--maroon)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700,
                marginTop: -20, border: '3px solid #fff',
              }}>
                +
              </span>
              <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--ink)' }}>Add status</span>
            </div>
          </>
        )}
      </CardShell>

      {otherGroups.map((g) => {
        const latest = latestOf(g);
        return (
          <CardShell key={g.author.id} onClick={() => setViewingIndex(groups.indexOf(g))} ring={null}>
            <PreviewBackground status={latest} />
            <div style={{
              position: 'absolute', top: 8, left: 8, width: 34, height: 34, borderRadius: '50%',
              border: `2px solid ${g.all_viewed ? '#fff' : 'var(--gold-bright)'}`, padding: 2, background: '#fff',
            }}>
              <div className="avatar-circle" style={{ width: '100%', height: '100%' }}>
                {g.author.avatar_url ? <img src={g.author.avatar_url} alt="" /> : (g.author.full_name?.charAt(0) || '?')}
              </div>
            </div>
            <NameLabel name={g.author.full_name?.split(' ')[0] || 'Student'} />
          </CardShell>
        );
      })}

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
