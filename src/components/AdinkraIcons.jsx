const baseProps = (size, strokeWidth) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});

// Dawuro — the forked-handle iron gong struck by town criers to call
// people to attention. The two small loops near the top are the
// carrying ring; the seam down the middle is the fold where the iron
// sheet is hammered into its cone shape.
export function Dawuro({ size = 22, strokeWidth = 1.6, className }) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M9.5 4.2c-.9 1-1.3 2.3-1.3 3.8v6.6c0 3 1.7 5.2 3.8 5.2s3.8-2.2 3.8-5.2V8c0-1.5-.4-2.8-1.3-3.8" />
      <path d="M9.8 4.6a2.2 2.2 0 0 1 4.4 0" />
      <path d="M12 6.4v13.4" />
      <path d="M8.6 10.5c1.1.5 2.3.8 3.4.8s2.3-.3 3.4-.8" />
      <path d="M16.6 16l3 2M19 19.4l.8-1.7" />
    </svg>
  );
}

// Sankofa — the bird reaching back for what was left behind, egg
// held in its beak, neck curved fully around over its own back.
export function Sankofa({ size = 22, strokeWidth = 1.6, className }) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M6 16.8c0-3 2.4-5.3 5.4-5.3 2.4 0 4.2 1.3 4.9 3.2" />
      <path d="M5.6 16.6c-1 .2-1.8.9-1.8 1.9 0 1.2 1.1 2 2.5 2 1.6 0 2.7-1 2.7-2.3" />
      <path d="M11.6 11.6c.2-1.7 1.3-2.9 1.1-4.5-.2-1.7-1.7-2.7-3.2-2.1-1.3.5-1.6 1.9-.7 2.7.8.7 2 .3 2-.7" />
      <circle cx="15.4" cy="8.3" r=".8" />
      <path d="M9 17.8l-1.4 3M12.2 18.3l-.6 3.2" />
    </svg>
  );
}

// Nkonsonkonson — three rounded links interlocked in an actual chain,
// alternating orientation the way a real welded chain does, not just
// overlapping ovals.
export function Nkonsonkonson({ size = 22, strokeWidth = 1.6, className }) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <rect x="2.5" y="8" width="7" height="9" rx="3.5" transform="rotate(-8 6 12.5)" />
      <rect x="8.5" y="4.5" width="7" height="9" rx="3.5" transform="rotate(90 12 9)" />
      <rect x="14.5" y="8" width="7" height="9" rx="3.5" transform="rotate(-8 18 12.5)" />
    </svg>
  );
}

// Akoma — the heart, drawn with the small hooked curls at each upper
// lobe traditional Adinkra carving uses instead of a smooth Valentine
// curve, plus the interior spiral marking patience.
export function Akoma({ size = 22, strokeWidth = 1.6, className }) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M12 20c-3.4-2.6-7-5.7-7-9.4 0-2.3 1.7-4 3.9-4 1.4 0 2.5.7 3.1 1.8.6-1.1 1.7-1.8 3.1-1.8 2.2 0 3.9 1.7 3.9 4 0 3.7-3.6 6.8-7 9.4z" />
      <path d="M6.3 7.4c-.7-.2-1.1-.8-.9-1.5M17.7 7.4c.7-.2 1.1-.8.9-1.5" />
      <path d="M11.1 9.8c-.9.6-1 1.6-.3 2.2.6.5 1.4.2 1.4-.6" />
    </svg>
  );
}

// Bese Saka — kola-nut pods bundled into a sack and cinched at the
// neck, symbolizing abundance shared among many.
export function BeseSaka({ size = 22, strokeWidth = 1.6, className }) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M12 3v2.4" />
      <path d="M9.3 5.4h5.4" />
      <path d="M8.6 5.4c-2 1.7-3.1 3.9-3.1 6.3 0 4.6 3 8.3 6.5 8.3s6.5-3.7 6.5-8.3c0-2.4-1.1-4.6-3.1-6.3" />
      <path d="M9 10.6c1-.6 2-.9 3-.9s2 .3 3 .9M8.3 14.4c1.2-.7 2.4-1 3.7-1s2.5.3 3.7 1" />
    </svg>
  );
}

// Aya — the fern, paired fronds climbing a central stem to a curled
// fiddlehead tip, standing for resourcefulness and endurance.
export function Aya({ size = 22, strokeWidth = 1.6, className }) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M12 21V8.5" />
      <path d="M12 8.5c-1.6 0-2.6-1-2.6-2.4 0-1 .7-1.7 1.6-1.7.8 0 1.3.6 1.1 1.3-.2.6-.9.7-1.1.2" />
      <path d="M12 12l-4-2M12 12l4-2M12 15.3l-4.2-1.6M12 15.3l4.2-1.6M12 18.5l-3.6-1.2M12 18.5l3.6-1.2" />
    </svg>
  );
}

// Fawohodie — two sweeping wings breaking away from a central twisted
// knot, the freedom to leave the bound shape behind.
export function Fawohodie({ size = 22, strokeWidth = 1.6, className }) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M12 12c-1-2.6-3.4-4.4-6.2-4.4-1 0-1.8.8-1.8 1.8 0 2.9 2.6 5.2 6 5.6" />
      <path d="M12 12c1-2.6 3.4-4.4 6.2-4.4 1 0 1.8.8 1.8 1.8 0 2.9-2.6 5.2-6 5.6" />
      <circle cx="12" cy="12" r="1.6" />
      <path d="M12 13.6c0 3.5-1.6 6-3.6 7.4M12 13.6c0 3.5 1.6 6 3.6 7.4" />
    </svg>
  );
}

// Nyame Dua — the three-forked altar post standing in its base bowl,
// where offerings to God were traditionally placed.
export function NyameDua({ size = 22, strokeWidth = 1.6, className }) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M7.5 20.5c0-1.3 2-2.3 4.5-2.3s4.5 1 4.5 2.3" />
      <path d="M12 18.2V9.5" />
      <path d="M12 11.5c0-2.8 1.8-4.8 4.2-4.8" />
      <path d="M12 11.5c0-2.8-1.8-4.8-4.2-4.8" />
      <path d="M12 9.8c0-3.3 2.3-5.8 5.2-5.8" />
      <circle cx="16.2" cy="6.7" r="1" />
      <circle cx="7.8" cy="6.7" r="1" />
      <circle cx="17.2" cy="4" r="1" />
    </svg>
  );
}

export const adinkraIcons = {
  notifications: Dawuro,
  history: Sankofa,
  friends: Nkonsonkonson,
  like: Akoma,
  groups: BeseSaka,
  bookmark: Aya,
  share: Fawohodie,
  verified: NyameDua,
};
