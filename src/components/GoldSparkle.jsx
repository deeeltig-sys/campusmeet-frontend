/**
 * The signature gold-sparkle motif. Deliberately small and used
 * sparingly — a scatter of 3–5 four-point stars that twinkle on a
 * staggered delay, dropped onto the handful of moments that should
 * feel like the premium beat of the app (splash, the USTED seal,
 * the verify action) rather than sprinkled everywhere as decoration.
 */
export default function GoldSparkle({ count = 4, className = '' }) {
  const sparkles = Array.from({ length: count });
  return (
    <span className={`sparkle-field ${className}`} aria-hidden="true">
      {sparkles.map((_, i) => (
        <svg
          key={i}
          className={`sparkle sparkle--${i}`}
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M12 0c0 4.5 1.2 6.6 3.4 8.6C17.6 10.6 19.7 11.8 24 12c-4.3 0.2-6.4 1.4-8.6 3.4C13.2 17.4 12 19.5 12 24c0-4.5-1.2-6.6-3.4-8.6C6.4 13.4 4.3 12.2 0 12c4.3-0.2 6.4-1.4 8.6-3.4C10.8 6.6 12 4.5 12 0z"
            fill="var(--gold-bright)"
          />
        </svg>
      ))}
    </span>
  );
}
