// Preset pack — big, expressive emoji rendered as sticker-style cards.
// Deliberately not tiny inline emoji (that's just typing 👋 in the
// composer); these render oversized with no bubble chrome, same
// visual language as PostCard/Conversation's emoji-only-message
// treatment, so a "sticker" reads as a distinct, chunkier gesture.
export const STICKER_PACK = [
  { id: 'wave', emoji: '👋', label: 'Wave' },
  { id: 'high-five', emoji: '🙌', label: 'High five' },
  { id: 'fire', emoji: '🔥', label: 'Fire' },
  { id: 'love', emoji: '❤️', label: 'Love it' },
  { id: 'laugh', emoji: '😂', label: 'Laugh' },
  { id: 'yawa', emoji: '😭', label: 'Yawa' },
  { id: 'cheers', emoji: '🥂', label: 'Cheers' },
  { id: 'clap', emoji: '👏', label: 'Clap' },
];

export function stickerEmoji(stickerId) {
  return STICKER_PACK.find((s) => s.id === stickerId)?.emoji || '👋';
}

export default function StickerPicker({ onPick, onClose }) {
  return (
    <div
      className="card"
      style={{
        position: 'absolute', bottom: '100%', left: 'var(--sp-4)', marginBottom: 8,
        padding: 'var(--sp-3)', zIndex: 20, display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--sp-2)', width: 240,
      }}
    >
      {STICKER_PACK.map((s) => (
        <button
          key={s.id}
          type="button"
          aria-label={s.label}
          onClick={() => { onPick(s.id); onClose?.(); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.8rem',
            padding: 6, borderRadius: 'var(--radius-sm)', lineHeight: 1,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ivory-dim)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
        >
          {s.emoji}
        </button>
      ))}
    </div>
  );
}
