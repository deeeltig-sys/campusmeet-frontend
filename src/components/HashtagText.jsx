import { Link } from 'react-router-dom';

const HASHTAG_RE = /#([A-Za-z0-9_]{2,50})/g;

// Splits post content on #hashtags (always) and @mentions (when a
// `mentions` list is passed) and renders each as a profile/hashtag
// link. There's no @username handle system in this schema — a
// mention is recorded server-side as an explicit {id, full_name} the
// composer's autocomplete picked, not parsed from free text — so
// here we look for that exact name substring in the content rather
// than matching a pattern the way hashtags work. Both token types are
// found first, then merged and sorted by position so overlapping or
// out-of-order matches never happen.
export default function HashtagText({ text, mentions }) {
  if (!text) return null;

  const tokens = [];

  HASHTAG_RE.lastIndex = 0;
  let match;
  while ((match = HASHTAG_RE.exec(text)) !== null) {
    tokens.push({
      start: match.index,
      end: HASHTAG_RE.lastIndex,
      render: (key) => (
        <Link
          key={key}
          to={`/hashtag/${match[1].toLowerCase()}`}
          onClick={(e) => e.stopPropagation()}
          style={{ color: 'var(--maroon)', fontWeight: 600, textDecoration: 'none' }}
        >
          #{match[1]}
        </Link>
      ),
    });
  }

  if (mentions && mentions.length > 0) {
    for (const m of mentions) {
      if (!m?.full_name) continue;
      const needle = `@${m.full_name}`;
      const idx = text.indexOf(needle);
      // Only the first occurrence — a name mentioned once in the
      // composer only ever gets tagged once, even if the same words
      // happen to appear again later in the caption.
      if (idx === -1) continue;
      const overlaps = tokens.some((t) => idx < t.end && idx + needle.length > t.start);
      if (overlaps) continue;
      tokens.push({
        start: idx,
        end: idx + needle.length,
        render: (key) => (
          <Link
            key={key}
            to={`/profile/${m.id}`}
            onClick={(e) => e.stopPropagation()}
            style={{ color: 'var(--maroon)', fontWeight: 600, textDecoration: 'none' }}
          >
            {needle}
          </Link>
        ),
      });
    }
  }

  if (tokens.length === 0) return text;

  tokens.sort((a, b) => a.start - b.start);

  const parts = [];
  let lastIndex = 0;
  tokens.forEach((t, i) => {
    if (t.start > lastIndex) parts.push(text.slice(lastIndex, t.start));
    parts.push(t.render(`tok-${i}`));
    lastIndex = t.end;
  });
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  return <>{parts}</>;
}
