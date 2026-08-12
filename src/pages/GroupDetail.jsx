import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GroupsAPI, PostsAPI, EventsAPI } from '../api/client';
import BackHeader from '../components/BackHeader';
import PostCard from '../components/PostCard';
import ReactorsModal from '../components/ReactorsModal';
import CommentsSheet from '../components/CommentsSheet';
import PeopleListModal from '../components/PeopleListModal';

export default function GroupDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [reactorsPostId, setReactorsPostId] = useState(null);
  const [commentsPostId, setCommentsPostId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [groupData, postsData, eventsData] = await Promise.all([
        GroupsAPI.get(groupId),
        GroupsAPI.posts(groupId),
        EventsAPI.listForGroup(groupId).catch(() => []),
      ]);
      setGroup(groupData);
      setPosts(Array.isArray(postsData) ? postsData : []);
      setUpcomingCount(Array.isArray(eventsData) ? eventsData.length : 0);
    } catch (err) {
      setError(err.message || "This group won't load right now.");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  async function handleJoinToggle() {
    if (!group || joinBusy) return;
    setJoinBusy(true);
    const wasMember = group.is_member;
    setGroup((prev) => ({ ...prev, is_member: !wasMember, member_count: prev.member_count + (wasMember ? -1 : 1) }));
    try {
      wasMember ? await GroupsAPI.leave(groupId) : await GroupsAPI.join(groupId);
    } catch (err) {
      setGroup((prev) => ({ ...prev, is_member: wasMember, member_count: prev.member_count + (wasMember ? 1 : -1) }));
      setError(err.message || "That didn't update. Try again.");
    } finally {
      setJoinBusy(false);
    }
  }

  async function handleReact(postId, type) {
    const current = posts.find((p) => p.id === postId);
    if (!current) return;
    const wasSame = current.user_reaction === type;
    const hadAny = current.user_reaction != null;
    const nextReaction = wasSame ? null : type;
    const countDelta = wasSame ? -1 : hadAny ? 0 : 1;
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, user_reaction: nextReaction, reaction_count: p.reaction_count + countDelta } : p)));
    try {
      wasSame ? await PostsAPI.unreact(postId) : await PostsAPI.react(postId, type);
    } catch {
      load();
    }
  }

  async function handleEditSave(postId, newContent) {
    await PostsAPI.update(postId, { content: newContent });
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, content: newContent } : p)));
  }

  async function handleDeletePost(postId) {
    await PostsAPI.softDelete(postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  if (loading) {
    return (
      <div className="screen">
        <BackHeader fallback="/groups" title="Loading…" />
        <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="screen">
        <BackHeader fallback="/groups" title="Group" />
        <div className="banner-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="screen">
      <BackHeader fallback="/groups" eyebrow={group.privacy === 'private' ? 'Private group' : 'Group'} title={group.name} />

      {error && <div className="banner-error">{error}</div>}

      <div className="card" style={{ marginBottom: 'var(--sp-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: group.description ? 'var(--sp-2)' : 0 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12, flexShrink: 0, overflow: 'hidden',
            background: 'var(--maroon-light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {group.avatar_url ? (
              <img src={group.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontFamily: 'var(--font-display)', color: 'var(--maroon-deep)', fontSize: '1.3rem' }}>
                {group.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {group.description && (
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)', margin: 0 }}>{group.description}</p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowMembers(true)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 'var(--fs-sm)', color: 'inherit' }}
          >
            <strong>{group.member_count}</strong> member{group.member_count === 1 ? '' : 's'}
          </button>

          {upcomingCount > 0 && (
            <button
              type="button"
              onClick={() => navigate(`/events?group_id=${groupId}`)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 'var(--fs-sm)', color: 'var(--maroon)' }}
            >
              {upcomingCount} upcoming event{upcomingCount === 1 ? '' : 's'}
            </button>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--sp-2)' }}>
            {group.my_role === 'admin' && (
              <button
                type="button"
                onClick={() => navigate(`/groups/${groupId}/settings`)}
                className="btn"
                style={{ fontSize: 'var(--fs-sm)', padding: '6px 14px' }}
              >
                Settings
              </button>
            )}
            {group.is_member && group.my_role !== 'admin' && (
              <button
                type="button"
                onClick={handleJoinToggle}
                disabled={joinBusy}
                className="btn"
                style={{ fontSize: 'var(--fs-sm)', padding: '6px 14px' }}
              >
                Leave
              </button>
            )}
            {!group.is_member && (
              <button
                type="button"
                onClick={handleJoinToggle}
                disabled={joinBusy}
                className="btn btn-primary"
                style={{ fontSize: 'var(--fs-sm)', padding: '6px 14px' }}
              >
                Join
              </button>
            )}
          </div>
        </div>
      </div>

      {group.is_member && (
        <button
          type="button"
          onClick={() => navigate('/create', { state: { groupId: group.id, groupName: group.name } })}
          className="btn btn-block"
          style={{ marginBottom: 'var(--sp-3)' }}
        >
          Post in {group.name}
        </button>
      )}

      {posts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-soft)' }}>No posts in this group yet.</p>
        </div>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onReact={handleReact}
            onEditSave={handleEditSave}
            onDeletePost={handleDeletePost}
            onShowReactors={setReactorsPostId}
            onShowComments={setCommentsPostId}
          />
        ))
      )}

      {showMembers && (
        <PeopleListModal
          title="Members"
          fetcher={() => GroupsAPI.members(groupId)}
          emptyText="No members yet."
          renderSubtext={(p) => (p.role === 'admin' ? 'Admin' : '')}
          onClose={() => setShowMembers(false)}
        />
      )}
      {reactorsPostId && <ReactorsModal postId={reactorsPostId} onClose={() => setReactorsPostId(null)} />}
      {commentsPostId && <CommentsSheet postId={commentsPostId} onClose={() => setCommentsPostId(null)} />}
    </div>
  );
}
