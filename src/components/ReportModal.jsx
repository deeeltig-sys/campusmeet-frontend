import { useState } from 'react';
import { ReportsAPI } from '../api/client';

const REASONS = [
  { value: 'sexual_harassment', label: 'Sexual harassment' },
  { value: 'tribal_harassment', label: 'Tribal / ethnic harassment' },
  { value: 'bullying', label: 'Bullying' },
  { value: 'personal_harassment', label: 'Personal harassment' },
  { value: 'false_info_defamation', label: 'False information / defamation' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'other', label: 'Other' },
];

export default function ReportModal({ targetType, targetId, onClose }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!reason || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await ReportsAPI.create(targetType, targetId, reason);
      setDone(true);
    } catch (err) {
      setError(err.message || 'Could not submit your report.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" style={{ maxHeight: '60vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet-header">
          <strong style={{ fontFamily: 'var(--font-display)', color: 'var(--maroon-deep)' }}>Report</strong>
          <button type="button" className="modal-sheet-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-sheet-body">
          {done ? (
            <p style={{ color: 'var(--ink-soft)' }}>
              Thanks — this has been sent to our moderators for review.
            </p>
          ) : (
            <>
              {error && <div className="banner-error">{error}</div>}
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)', marginBottom: 'var(--sp-3)' }}>
                What's the issue?
              </p>
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', fontSize: 'var(--fs-sm)' }}
                >
                  <input
                    type="radio"
                    name="report_reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                  />
                  {r.label}
                </label>
              ))}
              <button
                type="button"
                className="btn btn-primary btn-block"
                style={{ marginTop: 'var(--sp-3)' }}
                onClick={handleSubmit}
                disabled={!reason || submitting}
              >
                {submitting ? 'Submitting…' : 'Submit report'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
