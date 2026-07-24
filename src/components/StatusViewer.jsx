import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { StatusesAPI } from '../api/client';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';

const SLIDE_DURATION_MS = 5000;

export default function StatusViewer({ groups, startIndex, onClose }) {
  const { user } = useAuth();
  const [groupIndex, setGroupIndex] = useState(startIndex);
  const [statusIndex, setStatusIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const rafRef = useRef(null);
  const startRef = useRef(null);

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
    if (!current || paused) return;
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
  }, [groupIndex, statusIndex, paused]);

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
        <div className="avatar-circle" style={{ width: 32, height: 32 }}>
          {group.author.avatar_url ? <img src={group.author.avatar_url} alt="" /> : (group.author.full_name?.charAt(0) || '?')}
        </div>
        <span style={{ color: '#fff', fontSize: 'var(--fs-sm)', fontWeight: 600, flex: 1 }}>{group.author.full_name}</span>
        {isOwn && (
          <button type="button" onClick={handleDelete} aria-label="Delete status" style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', fontSize: '0.8rem' }}>
            Delete
          </button>
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
            <p style={{ color: '#fff', fontSize: 'var(--fs-xl)', textAlign: 'center', lineHeight: 1.5 }}>{current.text_content}</p>
          </div>
        ) : (
          <img src={current.image_url} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} draggable={false} />
        )}
      </div>
    </div>
  );
}
