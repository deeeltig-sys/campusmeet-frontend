/**
 * Abbreviates a count once it passes 1,000 — 1200 -> "1.2K", 45300 ->
 * "45.3K", 1200000 -> "1.2M". Under 1,000 returns the exact number.
 * Trims a trailing ".0" so round numbers read as "2K" not "2.0K".
 */
export function formatCount(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '0';
  if (n < 1000) return String(n);
  const units = [
    { value: 1_000_000_000, suffix: 'B' },
    { value: 1_000_000, suffix: 'M' },
    { value: 1_000, suffix: 'K' },
  ];
  for (const { value, suffix } of units) {
    if (n >= value) {
      const scaled = (n / value).toFixed(1).replace(/\.0$/, '');
      return `${scaled}${suffix}`;
    }
  }
  return String(n);
}
