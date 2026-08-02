import { useState, useEffect } from 'react';
import { InsightsAPI } from '../api/client';
import BackHeader from '../components/BackHeader';
import HashtagText from '../components/HashtagText';

function StatCard({ label, value }) {
  return (
    <div className="card" style={{ textAlign: 'center', flex: 1 }}>
      <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--maroon-deep)', display: 'block' }}>
        {value}
      </strong>
      <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)' }}>{label}</span>
    </div>
  );
}

export default function Insights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    InsightsAPI.get()
      .then(setData)
      .catch((err) => setError(err.message || 'Could not load your insights.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="screen">
      <BackHeader fallback="/profile" eyebrow="Private — only you can see this" title="Insights" />

      {loading && <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>}
      {error && <div className="banner-error">{error}</div>}

      {data && (
        <>
          <div style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)', flexWrap: 'wrap' }}>
            <StatCard label="Posts" value={data.total_posts} />
            <StatCard label="Views" value={data.total_views} />
            <StatCard label="Reactions" value={data.total_reactions} />
            <StatCard label="Comments" value={data.total_comments} />
          </div>

          <p className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>Your top posts</p>

          {data.top_posts.length === 0 ? (
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--ink-soft)' }}>Post something to start seeing performance here.</p>
            </div>
          ) : (
            data.top_posts.map((post) => (
              <div key={post.id} className="card" style={{ marginBottom: 'var(--sp-2)' }}>
                {post.content && (
                  <p style={{ fontSize: 'var(--fs-sm)', margin: '0 0 var(--sp-2)', lineHeight: 1.5 }}>
                    <HashtagText text={post.content} />
                  </p>
                )}
                {post.image_url && (
                  <img src={post.image_url} alt="" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: 'var(--sp-2)' }} />
                )}
                <div style={{ display: 'flex', gap: 'var(--sp-3)', fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)' }}>
                  <span>{post.view_count} views</span>
                  <span>{post.reaction_count} reactions</span>
                  <span>{post.comment_count} comments</span>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
