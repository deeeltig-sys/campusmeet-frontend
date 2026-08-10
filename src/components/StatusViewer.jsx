import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StatusesAPI } from '../api/client';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import AddToHighlightModal from './AddToHighlightModal';
import HashtagText from './HashtagText';

const SLIDE_DURATION_MS = 5000;
const REACTIONS = [
  { type: 'fire', emoji: '🔥' },
  { type: 'cosign', emoji: '🤝' },
  { type: 'doubt', emoji: '👎' },
  { type: 'yawa', emoji: '🚫' },
];

export default function StatusViewer({ groups, startIndex, onClose }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groupIndex, setGroupIndex] = useState(startIndex);
  const [statusIndex, setStatusIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  // Reaction state is tracked locally per status id rather than
  // mutating the `groups` prop directly (unlike handleDelete below) —
  // reactions change on every tap and need their own re-render without
  // fighting the auto-advance effect's dependency on groupIndex/statusIndex.
  const [reactionState, setReactionState] = useState({});

  const group = groups[groupIndex];
  const current = group?.statuses?.[statusIndex];
  const isOwn = group?.author?.id === user?.id;

  useEffect(() => {
    if (!current) return;
    StatusesAPI.markViewed(current.id).catch(() => {});
  }, [current?.id]);

  // Auto-advance — a per-status progress bar that fills over
  // SLIDE_DURATION_MS, same visual language as IG/Snapchat stories.
  useEffect(() => {
    if (!current || paused || showHighlightPicker) return;
    setProgress(0);
    startRef.current = performance.now();
    function tick(now) {
      const elapsed = now - startRef.current;
      const pct = Math.min(1, elapsed / SLIDE_DURATION_MS);
      setProgress(pct);
      if (pct >= 1) {
        goNextStatus();
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex, statusIndex, paused, showHighlightPicker]);

  function goNextStatus() {
    if (!group) return;
    if (statusIndex < group.statuses.length - 1) {
      setStatusIndex((i) => i + 1);
    } else {
      goNextGroup();
    }
  }
  function goPrevStatus() {
    if (statusIndex > 0) {
      setStatusIndex((i) => i - 1);
    } else {
      goPrevGroup();
    }
  }
  function goNextGroup() {
    if (groupIndex < groups.length - 1) {
      setGroupIndex((i) => i + 1);
      setStatusIndex(0);
    } else {
      onClose();
    }
  }
  function goPrevGroup() {
    if (groupIndex > 0) {
      setGroupIndex((i) => i - 1);
      setStatusIndex(0);
    } else {
      onClose();
    }
  }

  // Swipe left/right moves between PEOPLE (groups) — matches how
  // IG/Snapchat stories work: tap advances within one person's
  // statuses, swipe jumps to the next/previous person entirely.
  const { dragOffset, dragging, handlers } = useSwipeNavigation({
    onSwipeLeft: goNextGroup,
    onSwipeRight: goPrevGroup,
    threshold: 60,
  });

  async function handleDelete() {
    if (!window.confirm('Delete this status?')) return;
    try {
      await StatusesAPI.delete(current.id);
      if (group.statuses.length === 1) {
        goNextGroup();
      } else {
        group.statuses.splice(statusIndex, 1);
        setStatusIndex((i) => Math.min(i, group.statuses.length - 1));
      }
    } catch {
      // silently ignore — worst case the status just stays visible
    }
  }

  if (!current) return null;

  const isTextStatus = current.content_type === 'text';
  const myReaction = reactionState[current.id]?.user_reaction ?? current.user_reaction ?? null;
  const reactionCount = reactionState[current.id]?.reaction_count ?? current.reaction_count ?? 0;

  async function handleReact(type) {
    const wasSame = myReaction === type;
    const nextReaction = wasSame ? null : type;
    const hadAny = myReaction != null;
    const delta = wasSame ? -1 : hadAny ? 0 : 1;

    setReactionState((prev) => ({
      ...prev,
      [current.id]: { user_reaction: nextReaction, reaction_count: reactionCount + delta },
    }));
    try {
      if (wasSame) {
        await StatusesAPI.unreact(current.id);
      } else {
        await StatusesAPI.react(current.id, type);
      }
    } catch {
      // Best-effort — a failed status reaction isn't worth interrupting
      // the story-viewing flow with an error state.
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100, background: '#000',
        display: 'flex', flexDirection: 'column',
        transform: `translateX(${dragging ? dragOffset * 0.3 : 0}px)`,
      }}
      {...handlers}
    >
      <div style={{ display: 'flex', gap: 4, padding: 'var(--sp-3) var(--sp-3) 0' }}>
        {group.statuses.map((s, i) => (
          <div key={s.id} style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.35)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: '#fff', borderRadius: 2,
              width: i < statusIndex ? '100%' : i === statusIndex ? `${progress * 100}%` : '0%',
            }} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', padding: 'var(--sp-3)' }}>
        <button
          type="button"
          onClick={() => { onClose?.(); navigate(isOwn ? '/profile' : `/profile/${group.author.id}`); }}
          className="avatar-circle"
          style={{ width: 32, height: 32, border: 'none', padding: 0, cursor: 'pointer' }}
        >
          {group.author.avatar_url ? <img src={group.author.avatar_url} alt="" /> : (group.author.full_name?.charAt(0) || '?')}
        </button>
        <span
          onClick={() => { onClose?.(); navigate(isOwn ? '/profile' : `/profile/${group.author.id}`); }}
          style={{ color: '#fff', fontSize: 'var(--fs-sm)', fontWeight: 600, flex: 1, cursor: 'pointer' }}
        >
          {group.author.full_name}
        </span>
        {/* Public view count, visible to anyone viewing the status —
            not the private "who viewed" list (that's still author-only
            via the Highlight/viewers flow). This is the TikTok-style
            social-proof number: seeing "312 views" climb is what pulls
            people back to check their own status again. */}
        {typeof current.view_count === 'number' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'rgba(255,255,255,0.75)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            {current.view_count}
          </span>
        )}
        {isOwn && (
          <>
            <button type="button" onClick={() => setShowHighlightPicker(true)} aria-label="Add to highlight" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', fontSize: '0.8rem' }}>
              Highlight
            </button>
            <button type="button" onClick={handleDelete} aria-label="Delete status" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', fontSize: '0.8rem' }}>
              Delete
            </button>
          </>
        )}
        <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}>
          ×
        </button>
      </div>

      <div
        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
      >
        {/* Tap zones — left half rewinds, right half advances within
            this person's statuses. Separate from the swipe gesture,
            which moves between people instead. */}
        <button type="button" onClick={goPrevStatus} aria-label="Previous" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '35%', background: 'none', border: 'none', cursor: 'pointer' }} />
        <button type="button" onClick={goNextStatus} aria-label="Next" style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '35%', background: 'none', border: 'none', cursor: 'pointer' }} />

        {isTextStatus ? (
          <div style={{
            width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: current.background_color || '#7a2436', padding: 'var(--sp-5)',
          }}>
            <p style={{ color: '#fff', fontSize: 'var(--fs-xl)', textAlign: 'center', lineHeight: 1.5 }}>
              <HashtagText text={current.text_content} linkColor="var(--gold-bright)" />
            </p>
          </div>
        ) : (
          <img src={current.image_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} draggable={false} />
        )}
      </div>

      {showHighlightPicker && (
        <AddToHighlightModal
          statusId={current.id}
          onClose={() => setShowHighlightPicker(false)}
        />
      )}

      {/* Reaction bar — same four types as post reactions, one live
          reaction per person, tap again to remove. Kept off the main
          tap-zone area (bottom edge only) so it doesn't fight the
          prev/next tap zones above it. */}
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-3)' }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {REACTIONS.map(({ type, emoji }) => (
          <button
            key={type}
            type="button"
            onClick={() => handleReact(type)}
            aria-pressed={myReaction === type}
            style={{
              width: 38, height: 38, borderRadius: '50%', fontSize: '1.1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: myReaction === type ? '2px solid var(--gold-bright)' : '1.5px solid rgba(255,255,255,0.3)',
              background: myReaction === type ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.3)',
              cursor: 'pointer',
            }}
          >
            {emoji}
          </button>
        ))}
        {reactionCount > 0 && (
          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
            {reactionCount}
          </span>
        )}
      </div>
    </div>
  );
}
