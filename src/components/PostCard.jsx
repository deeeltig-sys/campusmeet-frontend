import VerifiedBadge from './VerifiedBadge';

export default function PostCard({ post, onReact }) {
  // reaction_count (singular) matches models/post.py's public_post_fields exactly.
  // user_reacted isn't part of that shape today — if your `feed` view doesn't add it,
  // the reaction button will still work (fire/unreact), it just won't show as
  // pre-toggled on load.
  const { content, created_at, reaction_count = 0, user_reacted } = post;

  // public_post_fields() only returns author_id (no nested author object), so the
  // `feed` DB view is what would actually join in name/verified — its exact column
  // names aren't confirmed here. This handles the two most likely shapes: a nested
  // `author` object, or flattened `author_full_name` / `author_verified_at` columns.
  const author = post.author || {
    full_name: post.author_full_name,
    verified: post.author_verified_at != null || post.author_verified,
  };

  return (
    <article className="card" style={{ marginBottom: 'var(--sp-4)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)' }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: '999px',
            background: 'var(--maroon-light)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', color: 'var(--maroon-deep)', fontWeight: 600,
          }}
        >
          {author.full_name ? author.full_name.charAt(0) : '?'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <strong style={{ fontSize: 'var(--fs-sm)' }}>{author.full_name || 'Student'}</strong>
            <VerifiedBadge verified={author.verified} size={15} />
          </div>
          {created_at && (
            <time style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--ink-soft)' }}>
              {new Date(created_at).toLocaleString()}
            </time>
          )}
        </div>
      </header>

      <p style={{ margin: 0, fontSize: 'var(--fs-base)', lineHeight: 1.55 }}>{content}</p>

      <footer style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginTop: 'var(--sp-4)' }}>
        <button
          onClick={() => onReact?.(post.id)}
          className="btn"
          style={{
            padding: '6px 14px',
            background: user_reacted ? 'var(--maroon-light)' : 'transparent',
            border: '1.5px solid var(--line)',
            color: 'var(--maroon-deep)',
            fontSize: 'var(--fs-sm)',
          }}
        >
          ♦ {reaction_count}
        </button>
      </footer>
    </article>
  );
}
