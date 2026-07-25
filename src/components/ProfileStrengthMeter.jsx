const CHECKLIST = [
  { key: 'avatar_url', label: 'Add a profile photo', weight: 25 },
  { key: 'bio', label: 'Write a bio', weight: 20 },
  { key: 'level_of_study', label: 'Set your level of study', weight: 15 },
  { key: 'social_links', label: 'Add a social link', weight: 25, check: (u) => Object.values(u?.social_links || {}).some(Boolean) },
  { key: 'has_posted', label: 'Share your first post', weight: 15, check: (u) => (u?._postCount || 0) > 0 },
];

export function computeProfileStrength(user, postCount = 0) {
  if (!user) return 0;
  const withCount = { ...user, _postCount: postCount };
  let score = 0;
  for (const item of CHECKLIST) {
    const done = item.check ? item.check(withCount) : !!withCount[item.key];
    if (done) score += item.weight;
  }
  return score;
}

export const STRONG_PROFILE_THRESHOLD = 80;

/**
 * A LinkedIn-style completion meter — deliberately not shaped or
 * colored like the maroon verified checkmark (VerifiedBadge). That
 * badge means "an admin confirmed your student ID"; this meter means
 * "you filled your profile in." Conflating the two would cheapen the
 * one signal that's actually backed by identity verification.
 */
export default function ProfileStrengthMeter({ user, postCount = 0 }) {
  const withCount = { ...user, _postCount: postCount };
  const strength = computeProfileStrength(user, postCount);
  const remaining = CHECKLIST.filter((item) => !(item.check ? item.check(withCount) : !!withCount[item.key]));

  return (
    <div className="card" style={{ marginBottom: 'var(--sp-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-2)' }}>
        <p className="eyebrow" style={{ margin: 0 }}>Profile strength</p>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--maroon-deep)' }}>
          {strength}%
        </span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'var(--line)', overflow: 'hidden', marginBottom: remaining.length ? 'var(--sp-3)' : 0 }}>
        <div style={{
          height: '100%', width: `${strength}%`, borderRadius: 3,
          background: strength >= STRONG_PROFILE_THRESHOLD
            ? 'linear-gradient(90deg, var(--gold), var(--gold-bright))'
            : 'var(--maroon)',
          transition: 'width 0.3s ease',
        }} />
      </div>
      {remaining.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {remaining.map((item) => (
            <li key={item.key} style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--gold)' }} />
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
