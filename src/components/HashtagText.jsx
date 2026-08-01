import { Link } from 'react-router-dom';

const HASHTAG_RE = /#([A-Za-z0-9_]{2,50})/g;

// Splits post content on #hashtags and renders each as a link to
// /hashtag/:tag, matching the same pattern the DB trigger uses to
// extract them (db/hashtags_migration.sql) so what's clickable here
// always lines up with what actually got indexed server-side.
export default function HashtagText({ text }) {
  if (!text) return null;

  const parts = [];
  let lastIndex = 0;
  let match;
  HASHTAG_RE.lastIndex = 0;

  while ((match = HASHTAG_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const tag = match[1].toLowerCase();
    parts.push(
      <Link
        key={`${match.index}-${tag}`}
        to={`/hashtag/${tag}`}
        onClick={(e) => e.stopPropagation()}
        style={{ color: 'var(--maroon)', fontWeight: 600, textDecoration: 'none' }}
      >
        #{match[1]}
      </Link>
    );
    lastIndex = HASHTAG_RE.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}
