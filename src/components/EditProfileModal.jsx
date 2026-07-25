import { useState, useEffect } from 'react';
import { ProfileAPI } from '../api/client';

const MAX_BIO_LENGTH = 280;
const LEVEL_OPTIONS = ['Level 100', 'Level 200', 'Level 300', 'Level 400', 'Graduate', 'Alumni'];

export default function EditProfileModal({ user, onClose, onSaved, onOpenSocialLinks }) {
  const [bio, setBio] = useState(user?.bio || '');
  const [level, setLevel] = useState(user?.level_of_study || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setBio(user?.bio || ''); setLevel(user?.level_of_study || ''); }, [user]);

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await ProfileAPI.updateMe({ bio: bio.trim(), level_of_study: level });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  const socialCount = Object.values(user?.social_links || {}).filter(Boolean).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" style={{ maxHeight: '85vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-sheet-header">
          <strong style={{ fontFamily: 'var(--font-display)', color: 'var(--maroon-deep)' }}>Edit profile</strong>
          <button type="button" className="modal-sheet-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {error && <div className="banner-error">{error}</div>}

        <div className="field" style={{ marginBottom: 'var(--sp-3)' }}>
          <label htmlFor="edit-bio">Bio</label>
          <textarea
            id="edit-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO_LENGTH))}
            placeholder="Second-year IT student. Into gaming and music."
            rows={3}
            style={{
              width: '100%', resize: 'vertical', padding: '10px 12px',
              border: '1px solid var(--line)', borderRadius: 10, fontFamily: 'inherit',
              fontSize: 'var(--fs-sm)', boxSizing: 'border-box',
            }}
          />
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', marginTop: 4, textAlign: 'right' }}>
            {bio.length}/{MAX_BIO_LENGTH}
          </p>
        </div>

        <div className="field" style={{ marginBottom: 'var(--sp-3)' }}>
          <label htmlFor="edit-level">Level of study</label>
          <select
            id="edit-level"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px', border: '1px solid var(--line)',
              borderRadius: 10, fontFamily: 'inherit', fontSize: 'var(--fs-sm)', background: '#fff',
            }}
          >
            <option value="">Not set</option>
            {LEVEL_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>

        <button
          type="button"
          className="card"
          onClick={() => { onClose(); onOpenSocialLinks?.(); }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
            border: 'none', cursor: 'pointer', textAlign: 'left', marginBottom: 'var(--sp-4)',
          }}
        >
          <div>
            <p style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, margin: 0 }}>Social links</p>
            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', margin: '2px 0 0' }}>
              {socialCount > 0 ? `${socialCount} platform${socialCount === 1 ? '' : 's'} added` : 'None added yet'}
            </p>
          </div>
          <span style={{ color: 'var(--ink-soft)' }}>›</span>
        </button>

        <button type="button" className="btn btn-primary btn-block" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}
