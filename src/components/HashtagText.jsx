import { Link } from 'react-router-dom';

const HASHTAG_RE = /#([A-Za-z0-9_]{2,50})/g;
// http(s)://... or bare www.something — the two shapes people actually
// paste. Deliberately excludes trailing sentence punctuation (a period,
// comma, closing paren etc. right after a URL is almost always part of
// the sentence, not the link) by trimming it off after matching rather
// than trying to exclude it in the regex itself, which gets unreadable
// fast once you account for URLs that legitimately end in a paren.
const URL_RE = /\b((?:https?:\/\/|www\.)[^\s<>"']+)/gi;

// Strips sentence punctuation that isn't part of the URL. Handles
// closing parens specially — an unmatched trailing ')' almost always
// closes the sentence, not the link, but a URL like
// wikipedia.org/wiki/Foo_(bar) has a legitimate one, so it only gets
// trimmed when there's no matching '(' earlier in the same match.
function trimTrailingPunctuation(url) {
  let trimmed = url.replace(/[.,!?;:'"\]}]+$/, '');
  while (trimmed.endsWith(')')) {
    const opens = (trimmed.match(/\(/g) || []).length;
    const closes = (trimmed.match(/\)/g) || []).length;
    if (closes > opens) {
      trimmed = trimmed.slice(0, -1);
    } else {
      break;
    }
  }
  return trimmed;
}
const TRAILING_PUNCT_RE = /[.,!?;:)\]}'"]+$/;

// Splits post content on #hashtags (always), @mentions (when a
// `mentions` list is passed), and any http(s)/www URL (always) —
// rendering each as a real link instead of static text. There's no
// @username handle system in this schema — a mention is recorded
// server-side as an explicit {id, full_name} the composer's
// autocomplete picked, not parsed from free text — so here we look
// for that exact name substring in the content rather than matching a
// pattern the way hashtags and URLs work. All token types are found
// first, then merged and sorted by position so overlapping or
// out-of-order matches never happen.
export default function HashtagText({ text, mentions, linkColor = 'var(--maroon)' }) {
  if (!text) return null;

  const tokens = [];

  HASHTAG_RE.lastIndex = 0;
  let match;
  while ((match = HASHTAG_RE.exec(text)) !== null) {
    // Capture this iteration's values into their own consts — `render`
    // is called later, after this while loop has fully finished, at
    // which point the shared `match` variable holds its FINAL value
    // (null, since that's what ends the loop). Closing over `match`
    // itself instead of its value here is what was crashing every
    // post that contained a hashtag with "Cannot read properties of
    // null (reading '1')".
    const tag = match[1];
    const start = match.index;
    const end = HASHTAG_RE.lastIndex;
    tokens.push({
      start,
      end,
      render: (key) => (
        <Link
          key={key}
          to={`/hashtag/${tag.toLowerCase()}`}
          onClick={(e) => e.stopPropagation()}
          style={{ color: linkColor, fontWeight: 600, textDecoration: 'none' }}
        >
          #{tag}
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
            style={{ color: linkColor, fontWeight: 600, textDecoration: 'none' }}
          >
            {needle}
          </Link>
        ),
      });
    }
  }

  URL_RE.lastIndex = 0;
  let urlMatch;
  while ((urlMatch = URL_RE.exec(text)) !== null) {
    const raw = urlMatch[1];
    const clean = trimTrailingPunctuation(raw);
    if (!clean) continue;
    const start = urlMatch.index;
    const end = start + clean.length;
    const overlaps = tokens.some((t) => start < t.end && end > t.start);
    if (overlaps) continue; // e.g. a URL that happens to contain a '#' fragment matching the hashtag pattern
    const href = /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
    tokens.push({
      start,
      end,
      render: (key) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{ color: linkColor, textDecoration: 'underline', wordBreak: 'break-word' }}
        >
          {clean}
        </a>
      ),
    });
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
