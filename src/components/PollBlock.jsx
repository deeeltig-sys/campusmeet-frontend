import { useState } from 'react';
import { PostsAPI } from '../api/client';

// Renders a poll's options as tappable rows. Before voting: plain
// buttons. After voting (or if you already had a vote when the post
// loaded): every option shows a filled percentage bar, and your own
// pick is highlighted — same "vote once, see results, can change your
// mind" contract IG/X polls use. Individual ballots are never shown;
// only totals, matching the backend's own privacy rule
// (poll_votes RLS: select own only).
export default function PollBlock({ post }) {
  const [poll, setPoll] = useState(post.poll);
  const [busy, setBusy] = useState(false);

  if (!poll) return null;
  const { options, total_votes, user_vote } = poll;
  const hasVoted = user_vote != null;

  async function handleVote(optionId) {
    if (busy) return;
    setBusy(true);

    const wasSame = user_vote === optionId;
    const prevPoll = poll;

    // Optimistic update: move this option's count, and the previous
    // pick's count if switching, before the network call resolves.
    setPoll((prev) => {
      const nextOptions = prev.options.map((o) => {
        if (o.id === optionId) return { ...o, vote_count: o.vote_count + (wasSame ? -1 : 1) };
        if (o.id === prev.user_vote && !wasSame) return { ...o, vote_count: Math.max(o.vote_count - 1, 0) };
        return o;
      });
      return {
        options: nextOptions,
        total_votes: prev.total_votes + (wasSame ? -1 : prev.user_vote ? 0 : 1),
        user_vote: wasSame ? null : optionId,
      };
    });

    try {
      if (wasSame) {
        await PostsAPI.unvote(post.id);
      } else {
        await PostsAPI.vote(post.id, optionId);
      }
    } catch {
      setPoll(prevPoll); // rollback
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: 'var(--sp-2) 0' }}>
      {options.map((opt) => {
        const pct = total_votes > 0 ? Math.round((opt.vote_count / total_votes) * 100) : 0;
        const isMine = user_vote === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => handleVote(opt.id)}
            disabled={busy}
            style={{
              position: 'relative', textAlign: 'left', width: '100%', padding: '10px 14px',
              borderRadius: 'var(--radius-md)', border: isMine ? '1.5px solid var(--maroon)' : '1px solid var(--line)',
              background: '#fff', overflow: 'hidden', cursor: busy ? 'default' : 'pointer',
            }}
          >
            {hasVoted && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute', inset: 0, width: `${pct}%`,
                  background: isMine ? 'var(--maroon-light)' : 'var(--line)',
                  opacity: 0.5, transition: 'width 0.25s ease',
                }}
              />
            )}
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 'var(--fs-sm)', fontWeight: isMine ? 700 : 500 }}>{opt.option_text}</span>
              {hasVoted && (
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>
                  {pct}%
                </span>
              )}
            </div>
          </button>
        );
      })}
      <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', margin: 0 }}>
        {total_votes} {total_votes === 1 ? 'vote' : 'votes'}
      </p>
    </div>
  );
}
