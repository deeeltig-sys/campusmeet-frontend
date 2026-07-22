// Small, consistent line-icon set matching the app's existing SVG style
// (BackHeader's arrow, BottomNav's tab icons) — used in place of raw
// emoji for reactions and comment/reaction counts, so the UI reads as
// a single deliberate visual system instead of mixing native emoji
// rendering (which looks different per-device/OS) with custom icons.

export function FireIcon({ size = 18, color = 'var(--maroon)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2c1 3-2.5 4-2.5 7a2.5 2.5 0 005 0c0-1-.5-1.7-.5-1.7 1.5 1 2.5 3 2.5 4.7a5 5 0 01-10 0c0-4 3-6 3.5-9.5 1 1 2 3 2 4.5"
        stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

export function CosignIcon({ size = 18, color = 'var(--maroon)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 13l3-3 4 4 7-7 4 4"
        stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      />
      <path d="M3 19h18" stroke={color} strokeWidth="1.7" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

export function DoubtIcon({ size = 18, color = 'var(--maroon)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 10a4 4 0 118 0c0 2.5-3 2.5-3 5"
        stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx="12" cy="18.5" r="1" fill={color} />
    </svg>
  );
}

export function YawaIcon({ size = 18, color = 'var(--maroon)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="1.7" />
      <path d="M6.5 6.5l11 11" stroke={color} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function ReactionIcon({ size = 15, color = 'var(--ink-soft)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2c1 3-2.5 4-2.5 7a2.5 2.5 0 005 0c0-1-.5-1.7-.5-1.7 1.5 1 2.5 3 2.5 4.7a5 5 0 01-10 0c0-4 3-6 3.5-9.5 1 1 2 3 2 4.5"
        stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

export function CommentIcon({ size = 15, color = 'var(--ink-soft)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 5.5h16v10.5H9l-4 3.5v-3.5H4z"
        stroke={color} strokeWidth="1.6" strokeLinejoin="round"
      />
    </svg>
  );
}

export const REACTION_ICONS = {
  fire: FireIcon,
  cosign: CosignIcon,
  doubt: DoubtIcon,
  yawa: YawaIcon,
};
