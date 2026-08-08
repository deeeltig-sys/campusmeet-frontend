import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ConversationsAPI, BlocksAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useIncomingMessages } from '../hooks/useIncomingMessages';
import VerifiedBadge from '../components/VerifiedBadge';
import ReportModal from '../components/ReportModal';

const TABS = [
  { key: 'active', label: 'Chats' },
  { key: 'hidden', label: 'Hidden messages' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'requests', label: 'Requests' },
  { key: 'deleted', label: 'Recent Deletes' },
];

const LONG_PRESS_MS = 480;

function timeAgo(iso) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

export default function Inbox() {
  const { user } = useAuth();
  const [tab, setTab] = useState('active');
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [actionSheetConv, setActionSheetConv] = useState(null); // long-pressed row
  const [reportTarget, setReportTarget] = useState(null); // { id } of the other_user
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const pressTimer = useRef(null);
  const longPressFired = useRef(false);

  const loadConversations = useCallback(async (activeTab) => {
    try {
      const data = await ConversationsAPI.list(activeTab);
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load chats.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    setSelectMode(false);
    setSelected(new Set());
    loadConversations(tab).finally(() => setLoading(false));
  }, [tab, loadConversations]);

  // Realtime: a new message anywhere refreshes this list right away
  // (updates unread bold/badge and reorders by last_message_at)
  // instead of waiting for the user to leave and reopen the tab. Falls
  // back to nothing if realtime isn't configured — the list still
  // loads correctly on open/tab-change either way, just without the
  // live nudge.
  useIncomingMessages(user?.id, () => loadConversations(tab));

  // Quiet background refresh so a new message bumps its conversation to
  // the top / updates the preview without the user pulling to refresh —
  // same near-real-time pattern used inside an open conversation.
  useEffect(() => {
    const interval = setInterval(() => {
      if (!selectMode) loadConversations(tab);
    }, 8000);
    return () => clearInterval(interval);
  }, [tab, selectMode, loadConversations]);

  useEffect(() => {
    if (tab !== 'active') return;
    ConversationsAPI.activeContacts().then((data) => setContacts(Array.isArray(data) ? data : [])).catch(() => {});
  }, [tab]);

  function refresh() {
    loadConversations(tab);
  }

  // Long-press handling — works for touch (phone) and mouse (desktop
  // testing) via the same timer-based approach, since there's no
  // native "long press" DOM event. The row is a router <Link>, so once
  // the timer fires and the action sheet opens, releasing the finger
  // would otherwise still fire the Link's click and navigate away out
  // from under the menu — `longPressFired` flags that so the row's
  // click handler can suppress it.
  function startPress(conv) {
    longPressFired.current = false;
    pressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setActionSheetConv(conv);
    }, LONG_PRESS_MS);
  }
  function cancelPress() {
    clearTimeout(pressTimer.current);
  }
  function handleRowClick(e) {
    if (longPressFired.current) {
      e.preventDefault();
      longPressFired.current = false;
    }
  }

  async function handleHide(conv) {
    try {
      await ConversationsAPI.hide(conv.id);
      setActionSheetConv(null);
      refresh();
    } catch (err) {
      setError(err.message || 'Could not hide chat.');
    }
  }
  async function handleUnhide(conv) {
    try {
      await ConversationsAPI.unhide(conv.id);
      refresh();
    } catch (err) {
      setError(err.message || 'Could not unhide chat.');
    }
  }
  async function handleDelete(conv) {
    try {
      await ConversationsAPI.softDelete(conv.id);
      setActionSheetConv(null);
      refresh();
    } catch (err) {
      setError(err.message || 'Could not delete chat.');
    }
  }
  async function handleRestore(conv) {
    try {
      await ConversationsAPI.restore(conv.id);
      refresh();
    } catch (err) {
      setError(err.message || 'Could not restore chat.');
    }
  }
  async function handleBlock(conv) {
    if (!conv.other_user?.id) return;
    if (!window.confirm(`Block ${conv.other_user.full_name || 'this person'}?`)) return;
    try {
      await BlocksAPI.block(conv.other_user.id);
      setActionSheetConv(null);
      refresh();
    } catch (err) {
      setError(err.message || 'Could not block.');
    }
  }
  async function handleUnblockSelected() {
    try {
      await Promise.all(
        conversations
          .filter((c) => selected.has(c.id) && c.other_user?.id)
          .map((c) => BlocksAPI.unblock(c.other_user.id))
      );
      setSelectMode(false);
      setSelected(new Set());
      refresh();
    } catch (err) {
      setError(err.message || 'Could not unblock.');
    }
  }

  function toggleSelected(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const rows = conversations; // 'active' filter already excludes requests/hidden/deleted/blocked server-side

  return (
    <div className="screen">
      <header style={{ marginBottom: 'var(--sp-3)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p className="eyebrow">Chats</p>
          <h1 className="h-display" style={{ fontSize: 'var(--fs-xl)' }}>
            {TABS.find((t) => t.key === tab)?.label}
          </h1>
        </div>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowOptionsMenu((v) => !v)}
            aria-label="Chat list options"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="5" cy="12" r="1.8" fill="var(--ink)" />
              <circle cx="12" cy="12" r="1.8" fill="var(--ink)" />
              <circle cx="19" cy="12" r="1.8" fill="var(--ink)" />
            </svg>
          </button>
          {showOptionsMenu && (
            <div className="card" style={{ position: 'absolute', top: '100%', right: 0, zIndex: 20, minWidth: 190, padding: 'var(--sp-2)' }}>
              {TABS.filter((t) => t.key !== 'active').map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className="post-action-link"
                  style={{ display: 'block', width: '100%', padding: '8px 4px', textAlign: 'left' }}
                  onClick={() => { setTab(t.key); setShowOptionsMenu(false); }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {tab !== 'active' && (
        <button type="button" className="post-action-link" style={{ marginBottom: 'var(--sp-3)' }} onClick={() => setTab('active')}>
          ← Back to chats
        </button>
      )}

      {tab === 'blocked' && conversations.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--sp-2)' }}>
          <button type="button" className="post-action-link" onClick={() => { setSelectMode((v) => !v); setSelected(new Set()); }}>
            {selectMode ? 'Cancel' : 'Select'}
          </button>
        </div>
      )}

      {/* Active-contacts strip — the people you're actively talking with,
          for quick access without scrolling the full list. Not real-time
          "online now" presence — there's no infra for that yet. */}
      {tab === 'active' && contacts.length > 0 && (
        <div style={{ display: 'flex', gap: 'var(--sp-3)', overflowX: 'auto', marginBottom: 'var(--sp-4)', paddingBottom: 4 }}>
          {contacts.map((c) => (
            <Link key={c.conversation_id} to={`/inbox/messages/${c.conversation_id}`} style={{ textDecoration: 'none', flex: '0 0 auto', textAlign: 'center', width: 60 }}>
              <div className="avatar-circle" style={{ width: 52, height: 52, margin: '0 auto', border: '2px solid var(--gold)' }}>
                {c.avatar_url ? <img src={c.avatar_url} alt="" /> : (c.full_name ? c.full_name.charAt(0) : '?')}
              </div>
              <p style={{ fontSize: '0.625rem', marginTop: 4, color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.full_name?.split(' ')[0] || 'Student'}
              </p>
            </Link>
          ))}
        </div>
      )}

      {error && <div className="banner-error">{error}</div>}
      {loading && <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>}

      {!loading && (
        rows.length > 0 ? (
          rows.map((c) => (
            <ConversationRow
              key={c.id} conv={c} tab={tab}
              onPressStart={() => startPress(c)} onPressEnd={cancelPress} onRowClick={handleRowClick}
              selectMode={selectMode} selected={selected.has(c.id)} onToggleSelect={() => toggleSelected(c.id)}
              onUnhide={() => handleUnhide(c)} onRestore={() => handleRestore(c)}
            />
          ))
        ) : (
          <p style={{ color: 'var(--ink-soft)' }}>Nothing here.</p>
        )
      )}

      {selectMode && selected.size > 0 && (
        <div style={{ position: 'sticky', bottom: 0, background: 'var(--ivory)', paddingTop: 'var(--sp-3)' }}>
          <button type="button" className="btn btn-primary btn-block" onClick={handleUnblockSelected}>
            Unblock ({selected.size})
          </button>
        </div>
      )}

      {actionSheetConv && (
        <div className="modal-overlay" onClick={() => setActionSheetConv(null)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-sheet-header">
              <strong>{actionSheetConv.other_user?.full_name || 'Chat'}</strong>
              <button type="button" className="modal-sheet-close" onClick={() => setActionSheetConv(null)} aria-label="Close">×</button>
            </div>
            <button type="button" className="post-action-link" style={{ display: 'block', width: '100%', padding: '10px 4px', textAlign: 'left' }} onClick={() => handleHide(actionSheetConv)}>
              Hide
            </button>
            <button type="button" className="post-action-link" style={{ display: 'block', width: '100%', padding: '10px 4px', textAlign: 'left' }} onClick={() => handleDelete(actionSheetConv)}>
              Delete
            </button>
            <button type="button" className="post-action-link" style={{ display: 'block', width: '100%', padding: '10px 4px', textAlign: 'left' }} onClick={() => handleBlock(actionSheetConv)}>
              Block
            </button>
            <button
              type="button" className="post-action-link" style={{ display: 'block', width: '100%', padding: '10px 4px', textAlign: 'left' }}
              onClick={() => { setReportTarget(actionSheetConv.other_user); setActionSheetConv(null); }}
            >
              Report
            </button>
          </div>
        </div>
      )}

      {reportTarget && (
        <ReportModal targetType="user" targetId={reportTarget.id} onClose={() => setReportTarget(null)} />
      )}
    </div>
  );
}

function ConversationRow({ conv, tab, onPressStart, onPressEnd, onRowClick, selectMode, selected, onToggleSelect, onUnhide, onRestore }) {
  const other = conv.other_user || {};
  const hasUnread = (conv.unread_count || 0) > 0;
  const rowContent = (
    <>
      <div className="avatar-circle">
        {other.avatar_url ? <img src={other.avatar_url} alt="" /> : (other.full_name ? other.full_name.charAt(0) : '?')}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <strong className="name-shine" style={{ fontSize: 'var(--fs-sm)' }}>{other.full_name || 'Student'}</strong>
          <VerifiedBadge verified={other.verified} size={13} />
        </div>
        {conv.is_request ? (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--bronze)' }}>Message request</span>
        ) : conv.last_message_preview ? (
          <p style={{
            fontSize: 'var(--fs-xs)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            color: hasUnread ? 'var(--ink)' : 'var(--ink-soft)', fontWeight: hasUnread ? 700 : 400,
          }}>
            {conv.last_message_preview}
          </p>
        ) : null}
      </div>
      {conv.last_message_at && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <time style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: hasUnread ? 'var(--maroon)' : 'var(--ink-soft)', fontWeight: hasUnread ? 700 : 400 }}>
            {timeAgo(conv.last_message_at)}
          </time>
          {hasUnread && (
            <span style={{
              minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: 'var(--maroon)', color: '#fff',
              fontSize: '0.625rem', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
            }}>
              {conv.unread_count > 9 ? '9+' : conv.unread_count}
            </span>
          )}
        </div>
      )}
    </>
  );

  const rowStyle = {
    display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 'var(--sp-2)',
    textDecoration: 'none', color: 'inherit', userSelect: 'none',
  };

  if (tab === 'blocked' && selectMode) {
    return (
      <button type="button" onClick={onToggleSelect} className="card" style={{ ...rowStyle, width: '100%', border: 'none', textAlign: 'left' }}>
        <input type="checkbox" checked={selected} onChange={() => {}} style={{ marginRight: 4 }} />
        {rowContent}
      </button>
    );
  }

  if (tab === 'hidden') {
    return (
      <div className="card" style={rowStyle}>
        {rowContent}
        <button type="button" className="post-action-link" onClick={onUnhide}>Unhide</button>
      </div>
    );
  }
  if (tab === 'deleted') {
    return (
      <div className="card" style={rowStyle}>
        {rowContent}
        <button type="button" className="post-action-link" onClick={onRestore}>Restore</button>
      </div>
    );
  }

  return (
    <Link
      to={`/inbox/messages/${conv.id}`}
      className="card"
      style={rowStyle}
      onTouchStart={onPressStart}
      onTouchEnd={onPressEnd}
      onMouseDown={onPressStart}
      onMouseUp={onPressEnd}
      onMouseLeave={onPressEnd}
      onClick={onRowClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      {rowContent}
    </Link>
  );
}
