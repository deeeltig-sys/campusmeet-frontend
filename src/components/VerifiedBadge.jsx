import GoldSparkle from './GoldSparkle';

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
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        role="img"
        aria-label="Verified student"
      >
        <circle cx="12" cy="12" r="11" fill="var(--maroon-light)" stroke="var(--gold)" strokeWidth="1.5" />
        <path
          d="M8 12.5l2.6 2.6L16.5 9"
          fill="none"
          stroke="var(--maroon-deep)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <GoldSparkle count={3} className="sparkle-field--badge" />
    </span>
  );
}
