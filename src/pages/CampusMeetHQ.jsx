import { useEffect, useState } from 'react';
import { SpotlightsAPI } from '../api/client';
import BackHeader from '../components/BackHeader';
import GoldSparkle from '../components/GoldSparkle';

/**
 * Public, must-know acknowledgment feed — not a donor wall, anyone
 * genuinely worth honoring on the platform. Read-only from here;
 * entries are only ever added through the owner-only Okyeame panel
 * (pages/Admin.jsx), so this page has no write path at all, by design.
 */
export default function CampusMeetHQ() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    SpotlightsAPI.list()
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || 'Could not load CampusMEET HQ.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="screen">
      <BackHeader fallback="/feed" eyebrow="CampusMEET" title="HQ" />

      <p style={{ color: 'var(--ink-soft)', fontSize: 'var(--fs-sm)', marginBottom: 'var(--sp-4)' }}>
        People worth knowing about, honored here by CampusMEET.
      </p>

      {error && <div className="banner-error">{error}</div>}

      {loading ? (
        <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-soft)' }}>Nothing here yet — check back soon.</p>
        </div>
      ) : (
        items.map((s) => (
          <div
            key={s.id}
            className="card"
            style={{
              marginBottom: 'var(--sp-4)', padding: 'var(--sp-4)',
              border: '1px solid var(--gold-bright)', position: 'relative', overflow: 'visible',
            }}
          >
            <GoldSparkle count={4} />
            {s.photo_url && (
              <img
                src={s.photo_url} alt=""
                style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', marginBottom: 'var(--sp-3)' }}
              />
            )}
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <strong style={{ fontSize: 'var(--fs-lg)', color: 'var(--gold-bright)' }}>{s.subject_name}</strong>
            </div>
            {s.subject_role && (
              <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', margin: '2px 0 0', fontFamily: 'var(--font-mono)' }}>
                {s.subject_role}
              </p>
            )}
            <p style={{ fontSize: 'var(--fs-sm)', margin: 'var(--sp-3) 0 0', lineHeight: 1.6 }}>{s.body}</p>
          </div>
        ))
      )}
    </div>
  );
}
