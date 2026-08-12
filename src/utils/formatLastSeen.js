// Formats a last_seen_at ISO timestamp the way Facebook/WhatsApp do:
// "Active now" while truly live (handled separately via presence —
// this function is ONLY for the offline fallback text), then
// "Active Xm ago" / "Active Xh ago" climbing to a full date once it's
// old enough that a relative count stops being useful.
export function formatLastSeen(lastSeenAt) {
  if (!lastSeenAt) return null;

  const then = new Date(lastSeenAt).getTime();
  if (Number.isNaN(then)) return null;

  const diffMs = Date.now() - then;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return 'Active just now';
  if (diffMin < 60) return `Active ${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Active ${diffHr}h ago`;

  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return 'Active yesterday';
  if (diffDays < 7) return `Active ${diffDays}d ago`;

  const date = new Date(lastSeenAt);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return `Active on ${date.toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric',
  })}`;
}
