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

export function Dawuro({ size = 22, strokeWidth = 1.6, className }) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M8 4h8" />
      <path d="M9 4c-1.2 1-1.6 2.4-1.6 4v6.5c0 3 1.9 5.3 4.6 5.3s4.6-2.3 4.6-5.3V8c0-1.6-.4-3-1.6-4" />
      <path d="M12 5v14.8" />
      <path d="M16.8 16.4l2.7 1.6" />
      <path d="M19.5 18l1-1.6" />
    </svg>
  );
}

export function Sankofa({ size = 22, strokeWidth = 1.6, className }) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <ellipse cx="10" cy="15" rx="5.2" ry="4" />
      <path d="M13.6 12.5c1.6-1.4 2.3-3 1.7-4.6-.6-1.6-2.4-2.2-3.6-1.2-1 .8-.9 2.1.2 2.6.9.4 1.9-.2 1.7-1.1" />
      <circle cx="14.6" cy="7.6" r=".7" />
      <path d="M6 14.5l-1.8.6M6.6 17l-1.6 1" />
      <path d="M9 19.5l-.8 1.6M12.5 19.7l.3 1.8" />
    </svg>
  );
}

export function Nkonsonkonson({ size = 22, strokeWidth = 1.6, className }) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <ellipse cx="7.5" cy="8.5" rx="4" ry="3" transform="rotate(-25 7.5 8.5)" />
      <ellipse cx="12" cy="12" rx="4" ry="3" transform="rotate(-25 12 12)" />
      <ellipse cx="16.5" cy="15.5" rx="4" ry="3" transform="rotate(-25 16.5 15.5)" />
    </svg>
  );
}

export function Akoma({ size = 22, strokeWidth = 1.6, className }) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M12 20.2c-3.6-2.5-7.6-5.6-7.6-9.6 0-2.5 2-4.4 4.4-4.4 1.5 0 2.7.8 3.2 1.9.5-1.1 1.7-1.9 3.2-1.9 2.4 0 4.4 1.9 4.4 4.4 0 4-4 7.1-7.6 9.6z" />
      <path d="M11.3 10.4c-.8.7-.9 1.7-.2 2.3.6.5 1.5.3 1.6-.5" />
    </svg>
  );
}

export function BeseSaka({ size = 22, strokeWidth = 1.6, className }) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M12 3.5v3" />
      <circle cx="12" cy="10" r="2.6" />
      <circle cx="7.2" cy="13.2" r="2.6" />
      <circle cx="16.8" cy="13.2" r="2.6" />
      <circle cx="9.4" cy="18" r="2.6" />
      <circle cx="14.6" cy="18" r="2.6" />
    </svg>
  );
}

export function Aya({ size = 22, strokeWidth = 1.6, className }) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M12 21V5.5" />
      <path d="M12 5.5c0-1.4.9-2.2 2-2.2" />
      <path d="M12 8.5l-4-2.3M12 8.5l4-2.3" />
      <path d="M12 12l-4.4-2M12 12l4.4-2" />
      <path d="M12 15.5l-4.4-1.6M12 15.5l4.4-1.6" />
      <path d="M12 19l-3.6-1M12 19l3.6-1" />
    </svg>
  );
}

export function Fawohodie({ size = 22, strokeWidth = 1.6, className }) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M12 4.5a7.5 7.5 0 1 1-6.2 3.3" />
      <path d="M4.6 9l1.2-2.3-2.4-.9" />
      <path d="M12 4.5V2M15.5 5.4l1.3-2M8.5 5.4l-1.3-2" />
    </svg>
  );
}

export function NyameDua({ size = 22, strokeWidth = 1.6, className }) {
  return (
    <svg {...baseProps(size, strokeWidth)} className={className}>
      <path d="M12 21v-8.5" />
      <path d="M12 12.5v-4" />
      <path d="M12 8.5c0-2.2 1.6-3.8 3.8-3.8" />
      <path d="M12 8.5c0-2.2-1.6-3.8-3.8-3.8" />
      <path d="M12 8.5c0-2.6 2-4.7 4.6-4.7" />
      <circle cx="15.8" cy="4.7" r=".9" />
      <circle cx="8.2" cy="4.7" r=".9" />
      <circle cx="16.6" cy="3.8" r=".9" />
      <path d="M8 21h8" />
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
