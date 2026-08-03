import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GroupsAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import BackHeader from '../components/BackHeader';
import VerifiedBadge from '../components/VerifiedBadge';

export default function GroupSettings() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState('public');
  const [saving, setSaving] = useState(false);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [memberBusyId, setMemberBusyId] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [groupData, membersData] = await Promise.all([
        GroupsAPI.get(groupId),
        GroupsAPI.members(groupId),
      ]);
      if (groupData.my_role !== 'admin') {
        navigate(`/groups/${groupId}`);
        return;
      }
      setGroup(groupData);
      setName(groupData.name);
      setDescription(groupData.description || '');
      setPrivacy(groupData.privacy);
      setMembers(Array.isArray(membersData) ? membersData : []);
    } catch (err) {
      setError(err.message || 'Could not load group settings.');
    } finally {
      setLoading(false);
    }
  }, [groupId, navigate]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(e) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError('Group name must be at least 2 characters.');
      return;
    }
    setError('');
    setSaving(true);
    setSaved(false);
    try {
      const updated = await GroupsAPI.update(groupId, {
        name: name.trim(),
        description: description.trim(),
        privacy,
      });
      setGroup((prev) => ({ ...prev, ...updated }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please pick an image file.');
      return;
    }
    setError('');
    setAvatarUploading(true);
    try {
      const updated = await GroupsAPI.uploadAvatar(groupId, file);
      setGroup((prev) => ({ ...prev, ...updated }));
    } catch (err) {
      setError(err.message || 'Could not upload group photo.');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRoleChange(member, nextRole) {
    setMemberBusyId(member.id);
    setError('');
    try {
      await GroupsAPI.updateMemberRole(groupId, member.id, nextRole);
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, role: nextRole } : m)));
    } catch (err) {
      setError(err.message || 'Could not update that member.');
    } finally {
      setMemberBusyId(null);
    }
  }

  async function handleRemoveMember(member) {
    if (!window.confirm(`Remove ${member.full_name} from ${group.name}?`)) return;
    setMemberBusyId(member.id);
    setError('');
    try {
      await GroupsAPI.removeMember(groupId, member.id);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
    } catch (err) {
      setError(err.message || 'Could not remove that member.');
    } finally {
      setMemberBusyId(null);
    }
  }

  async function handleDeleteGroup() {
    setDeleteBusy(true);
    setError('');
    try {
      await GroupsAPI.delete(groupId);
      navigate('/groups');
    } catch (err) {
      setError(err.message || 'Could not delete this group.');
      setDeleteBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="screen">
        <BackHeader fallback={`/groups/${groupId}`} title="Loading…" />
        <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="screen">
        <BackHeader fallback="/groups" title="Group settings" />
        <div className="banner-error">{error || 'Could not load this group.'}</div>
      </div>
    );
  }

  const isCreator = group.creator_id === user?.id;

  return (
    <div className="screen">
      <BackHeader fallback={`/groups/${groupId}`} eyebrow={group.name} title="Group settings" />

      {error && <div className="banner-error">{error}</div>}
      {saved && (
        <div className="card" style={{ background: 'var(--maroon-light)', marginBottom: 'var(--sp-3)' }}>
          <p style={{ margin: 0, fontSize: 'var(--fs-sm)', color: 'var(--maroon-deep)' }}>Saved.</p>
        </div>
      )}

      {/* Group photo */}
      <div className="card" style={{ marginBottom: 'var(--sp-3)', display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 14, flexShrink: 0, overflow: 'hidden',
          background: 'var(--maroon-light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {group.avatar_url ? (
            <img src={group.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontFamily: 'var(--font-display)', color: 'var(--maroon-deep)', fontSize: '1.5rem' }}>
              {group.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            className="btn"
            style={{ fontSize: 'var(--fs-sm)', padding: '6px 14px' }}
          >
            {avatarUploading ? 'Uploading…' : 'Change photo'}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
        </div>
      </div>

      {/* Name / description / privacy */}
      <form onSubmit={handleSave} className="card" style={{ marginBottom: 'var(--sp-3)' }}>
        <p className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>About</p>

        <div className="field">
          <label htmlFor="name">Group name</label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }}
          />
        </div>

        <div className="field">
          <label>Privacy</label>
          <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
            <button type="button" onClick={() => setPrivacy('public')} className={privacy === 'public' ? 'btn btn-primary' : 'btn'} style={{ fontSize: 'var(--fs-sm)', padding: '6px 14px' }}>
              Public
            </button>
            <button type="button" onClick={() => setPrivacy('private')} className={privacy === 'private' ? 'btn btn-primary' : 'btn'} style={{ fontSize: 'var(--fs-sm)', padding: '6px 14px' }}>
              Private
            </button>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={saving || name.trim().length < 2}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      {/* Member management */}
      <div className="card" style={{ marginBottom: 'var(--sp-3)' }}>
        <p className="eyebrow" style={{ marginBottom: 'var(--sp-2)' }}>Members ({members.length})</p>
        {members.map((m) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
            <div className="avatar-circle" style={{ width: 30, height: 30, fontSize: '0.8rem' }}>
              {m.avatar_url ? <img src={m.avatar_url} alt="" /> : (m.full_name ? m.full_name.charAt(0) : '?')}
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <span style={{ fontSize: 'var(--fs-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.full_name}</span>
              <VerifiedBadge verified={m.verified} size={13} />
            </div>
            {m.role === 'admin' ? (
              <button
                type="button"
                onClick={() => handleRoleChange(m, 'member')}
                disabled={memberBusyId === m.id}
                style={{ fontSize: 'var(--fs-xs)', background: 'none', border: 'none', color: 'var(--maroon)', fontWeight: 600, cursor: 'pointer' }}
              >
                Admin · demote
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleRoleChange(m, 'admin')}
                  disabled={memberBusyId === m.id}
                  style={{ fontSize: 'var(--fs-xs)', background: 'none', border: 'none', color: 'var(--ink-soft)', cursor: 'pointer' }}
                >
                  Make admin
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveMember(m)}
                  disabled={memberBusyId === m.id}
                  style={{ fontSize: 'var(--fs-xs)', background: 'none', border: 'none', color: '#b3261e', cursor: 'pointer' }}
                >
                  Remove
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Danger zone — creator-only both here and server-side. */}
      {isCreator && (
      <div className="card" style={{ borderColor: '#b3261e' }}>
        <p className="eyebrow" style={{ marginBottom: 'var(--sp-2)', color: '#b3261e' }}>Danger zone</p>
        {!confirmingDelete ? (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            style={{ fontSize: 'var(--fs-sm)', background: 'none', border: '1px solid #b3261e', color: '#b3261e', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}
          >
            Delete this group
          </button>
        ) : (
          <div>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)' }}>
              This permanently deletes the group and every post in it. This can't be undone.
            </p>
            <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
              <button
                type="button"
                onClick={handleDeleteGroup}
                disabled={deleteBusy}
                style={{ fontSize: 'var(--fs-sm)', background: '#b3261e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}
              >
                {deleteBusy ? 'Deleting…' : 'Yes, delete it'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleteBusy}
                className="btn"
                style={{ fontSize: 'var(--fs-sm)', padding: '8px 14px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
