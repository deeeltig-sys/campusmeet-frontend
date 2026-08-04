import GoldSparkle from './GoldSparkle';
import { NyameDua } from './AdinkraIcons';

export default function VerifiedBadge({ verified, size = 18 }) {
  if (!verified) {
    return (
      <span
        title="Not yet verified"
        style={{
          display: 'inline-flex',
          width: size,
          height: size,
          borderRadius: '999px',
          border: '1.5px dashed var(--line)',
        }}
      />
    );
  }
  // Nyame Dua — "God's tree," the household altar symbol, meaning
  // sanctuary and trusted presence. Swapped in for the generic
  // checkmark to mark a verified student as vouched-for, not just
  // ticked off a list.
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Verified student">
        <circle cx="12" cy="12" r="11" fill="var(--maroon-light)" stroke="var(--gold)" strokeWidth="1.5" />
      </svg>
      <span
        style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--maroon-deep)',
        }}
      >
        <NyameDua size={size * 0.62} strokeWidth={1.8} />
      </span>
      <GoldSparkle count={3} className="sparkle-field--badge" />
    </span>
  );
}
