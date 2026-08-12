import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ConversationsAPI, BlocksAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useConversationMessages } from '../hooks/useIncomingMessages';
import { useIsOnline } from '../hooks/usePresence';
import { formatLastSeen } from '../utils/formatLastSeen';
import { REACTION_EMOJI } from '../components/icons';
import WallpaperModal, { WALLPAPER_PRESETS } from '../components/WallpaperModal';
import VoiceRecorder from '../components/VoiceRecorder';
import VoiceMessage from '../components/VoiceMessage';
import StickerPicker, { stickerEmoji } from '../components/StickerPicker';

// Quick-react bar on long-press — same vocabulary as post reactions
// (REACTION_TYPES in api/client.js), not a separate emoji set.
const QUICK_REACTIONS = ['like', 'fire', 'cosign', 'yawa'];
const LONG_PRESS_MS = 420;

// Cheap signature of everything that can change WITHOUT the message
// count changing (delivered_at/read_at ticks, reactions) — the poll
// fallback below compares this, not just messages.length, otherwise
// a tick flip or a reaction from the other side would silently sit
// unrendered for up to 4s even though the data already arrived.
function receiptSignature(msgs) {
  return msgs.map((m) => {
    const reactions = (m.message_reactions || []).map((r) => `${r.user_id}:${r.emoji}`).sort().join(',');
    return `${m.id}:${m.delivered_at || ''}:${m.read_at || ''}:${reactions}`;
  }).join('|');
}

function timeLabel(iso) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return sameDay ? time : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} · ${time}`;
}

// ---- Tier 1: Messenger/IG-style rendering helpers ----

// Consecutive messages from the same sender, within this window of
// each other, render as one visual cluster: tight spacing between
// them, and the avatar/timestamp only show once per cluster (on the
// last bubble) instead of on every single message — this is the
// biggest single visual difference between a "chat log" feel and an
// actual Messenger/IG feel.
const CLUSTER_WINDOW_MS = 5 * 60 * 1000;

function buildClusters(messages) {
  const clusters = [];
  let current = null;
  for (const m of messages) {
    const prev = current?.messages[current.messages.length - 1];
    const sameSender = prev && prev.sender_id === m.sender_id;
    const withinWindow = prev && new Date(m.created_at) - new Date(prev.created_at) <= CLUSTER_WINDOW_MS;
    if (current && sameSender && withinWindow) {
      current.messages.push(m);
    } else {
      current = { sender_id: m.sender_id, messages: [m] };
      clusters.push(current);
    }
  }
  return clusters;
}

// Matches a message that's ONLY emoji (optionally a few, optionally
// with whitespace between) — these render oversized with no bubble at
// all, the same "no words needed" treatment Messenger/IG/WhatsApp give
// a bare 🔥 or 😂 reply.
const EMOJI_ONLY_RE = /^(\p{Extended_Pictographic}\uFE0F?\s*){1,3}$/u;
function isEmojiOnlyMessage(text) {
  return typeof text === 'string' && text.trim().length > 0 && EMOJI_ONLY_RE.test(text.trim());
}


// Samples a custom wallpaper photo to decide whether bubbles/text need
// light or dark treatment — "reshuffle text colors for a clearer view
// according to what color is chosen", done automatically rather than
// asking the user to also pick a text-contrast mode by hand.
function useSampledBrightness(imageUrl) {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 20; canvas.height = 20;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 20, 20);
        const { data } = ctx.getImageData(0, 0, 20, 20);
        let total = 0;
        for (let i = 0; i < data.length; i += 4) {
          total += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }
        setIsDark(total / (data.length / 4) < 130);
      } catch {
        setIsDark(false); // canvas sampling can fail on some data URLs — default to light treatment
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);
  return isDark;
}

export default function Conversation() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [conv, setConv] = useState(null);
  const isOtherOnline = useIsOnline(conv?.other_user?.id);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showWallpaper, setShowWallpaper] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [reactingTo, setReactingTo] = useState(null); // message id with the quick-react bar open
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const bottomRef = useRef(null);
  const reactPressTimer = useRef(null);
  const reactLongPressFired = useRef(false);

  const load = useCallback(async () => {
    setError('');
    try {
      // The conversation being opened might be an accepted chat, a
      // pending message request, or (rarely) a blocked one — it is NOT
      // guaranteed to be in the 'active' filter, which is what caused
      // the bug: a message request opened with `conv` staying null, so
      // `is_request` never resolved and the Accept button never showed.
      // Check 'active' and 'requests' together (the two common entry
      // points), and only fall back to 'blocked' if neither has it.
      const [msgs, activeList, requestList] = await Promise.all([
        ConversationsAPI.messages(conversationId),
        ConversationsAPI.list('active'),
        ConversationsAPI.list('requests'),
      ]);
      setMessages(Array.isArray(msgs) ? msgs : []);
      // ConversationsAPI.messages() is what triggers the backend to
      // mark incoming unread messages as read (routes/messages.py's
      // GET /messages handler) — this tells BottomNav.jsx to refresh
      // the Chats badge right away instead of waiting up to 30s.
      window.dispatchEvent(new CustomEvent('campusmeet:messages-read'));

      let found = [
        ...(Array.isArray(activeList) ? activeList : []),
        ...(Array.isArray(requestList) ? requestList : []),
      ].find((c) => c.id === conversationId);

      if (!found) {
        const blockedList = await ConversationsAPI.list('blocked').catch(() => []);
        found = (Array.isArray(blockedList) ? blockedList : []).find((c) => c.id === conversationId);
      }

      setConv(found || null);
    } catch (err) {
      setError(err.message || 'Could not load this conversation.');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const [otherTyping, setOtherTyping] = useState(false);
  const typingIdleTimer = useRef(null);
  const wasTypingRef = useRef(false);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fallback poll — kept even now that realtime (below) exists, since
  // some campus networks block websockets outright and this is the
  // safety net for that case. Compares a full receipt signature (ids +
  // delivered_at + read_at + reactions), not just message COUNT — a
  // tick flipping from delivered to read, or a reaction landing, never
  // changes the count, so a length-only check would leave those stuck
  // stale for up to 4s despite the data already being on the server.
  // Still only replaces state when something actually changed, so it
  // doesn't fight the user's scroll position or flicker every tick.
  useEffect(() => {
    if (!conversationId) return;
    const interval = setInterval(async () => {
      try {
        const msgs = await ConversationsAPI.messages(conversationId);
        if (Array.isArray(msgs)) {
          setMessages((prev) => (receiptSignature(msgs) !== receiptSignature(prev) ? msgs : prev));
        }
      } catch {
        // silent — this is a background refresh, not a user action
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [conversationId]);

  // Realtime: appends a new message the instant it's inserted, instead
  // of waiting for the next 4s poll tick above. Safe to run alongside
  // the poll — both key off message id/count, so neither duplicates
  // what the other already added (see hooks/useIncomingMessages.js).
  //
  // The UPDATE side is what makes a sent message's tick flip to
  // delivered/read (near-)instantly on THIS screen too, rather than
  // waiting for the poll — e.g. the other person opening the thread
  // fires a read_at UPDATE that reaches the sender's open chat right
  // away instead of up to 4s later.
  useConversationMessages(
    conversationId,
    (row) => {
      setMessages((prev) => (prev.some((m) => m.id === row.id) ? prev : [...prev, row]));
    },
    (row) => {
      setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...m, ...row } : m)));
    },
  );

  // Polls whether the other participant is currently typing. Kept
  // separate from the message poll so a slow/failed typing check never
  // blocks new messages from showing up.
  useEffect(() => {
    if (!conversationId) return;
    const interval = setInterval(async () => {
      try {
        const res = await ConversationsAPI.getTyping(conversationId);
        setOtherTyping(!!res?.typing);
      } catch {
        // silent
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [conversationId]);

  // Pings /typing as the user types (debounced to avoid a request per
  // keystroke) and clears it after a short pause or on unmount, so a
  // typing indicator never gets stuck on for the other person.
  useEffect(() => {
    if (!conversationId) return;
    const isTypingNow = draft.trim().length > 0;
    if (isTypingNow && !wasTypingRef.current) {
      ConversationsAPI.setTyping(conversationId, true).catch(() => {});
      wasTypingRef.current = true;
    }
    clearTimeout(typingIdleTimer.current);
    typingIdleTimer.current = setTimeout(() => {
      if (wasTypingRef.current) {
        ConversationsAPI.setTyping(conversationId, false).catch(() => {});
        wasTypingRef.current = false;
      }
    }, 2500);
    return () => clearTimeout(typingIdleTimer.current);
  }, [draft, conversationId]);

  useEffect(() => () => {
    if (conversationId && wasTypingRef.current) {
      ConversationsAPI.setTyping(conversationId, false).catch(() => {});
    }
  }, [conversationId]);

  const isRecipientOfPendingRequest = conv?.is_request;
  const wallpaperKey = conv?.wallpaper || 'system';
  const preset = WALLPAPER_PRESETS[wallpaperKey] || WALLPAPER_PRESETS.system;
  const customBrightnessIsDark = useSampledBrightness(wallpaperKey === 'custom' ? conv?.custom_wallpaper_url : null);
  const isDarkBg = wallpaperKey === 'custom' ? customBrightnessIsDark : preset.dark;

  const wallpaperStyle = wallpaperKey === 'custom' && conv?.custom_wallpaper_url
    ? { backgroundImage: `url(${conv.custom_wallpaper_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: preset.bg };

  async function handleAccept() {
    try {
      await ConversationsAPI.accept(conversationId);
      setConv((c) => (c ? { ...c, status: 'accepted', is_request: false } : c));
    } catch (err) {
      setError(err.message || 'Could not accept this conversation.');
    }
  }

  async function handleSend() {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setError('');
    try {
      const msg = await ConversationsAPI.sendMessage(conversationId, content);
      setMessages((prev) => [...prev, msg]);
      setDraft('');
      wasTypingRef.current = false;
      ConversationsAPI.setTyping(conversationId, false).catch(() => {});
    } catch (err) {
      setError(err.message || 'Could not send — you may need to accept this conversation first.');
    } finally {
      setSending(false);
    }
  }

  async function handleSendSticker(stickerId) {
    setError('');
    try {
      const msg = await ConversationsAPI.sendSticker(conversationId, stickerId);
      setMessages((prev) => [...prev, msg]);
    } catch (err) {
      setError(err.message || 'Could not send — you may need to accept this conversation first.');
    }
  }

  function handleVoiceSent(msg) {
    setMessages((prev) => [...prev, msg]);
  }

  // Reactions propagate instantly on THIS screen (optimistic — applied
  // to local state immediately, not held for the network round trip)
  // since that's the reacting user's own action. On the OTHER
  // person's screen it currently arrives via the 4s poll fallback,
  // not realtime — message_reactions is a separate table from
  // messages, and the realtime subscription above is scoped to
  // messages only. Worth a follow-up if instant cross-device reaction
  // delivery matters enough to add a second channel for it.
  async function handleReact(message, emoji) {
    setReactingTo(null);
    const myExisting = (message.message_reactions || []).find((r) => r.user_id === user?.id);
    const isRemoving = myExisting?.emoji === emoji;

    setMessages((prev) => prev.map((m) => {
      if (m.id !== message.id) return m;
      const withoutMine = (m.message_reactions || []).filter((r) => r.user_id !== user?.id);
      return {
        ...m,
        message_reactions: isRemoving ? withoutMine : [...withoutMine, { user_id: user?.id, emoji }],
      };
    }));

    try {
      if (isRemoving) {
        await ConversationsAPI.unreact(conversationId, message.id);
      } else {
        await ConversationsAPI.react(conversationId, message.id, emoji);
      }
    } catch {
      // Silent — the next poll (max 4s) reconciles local state with
      // the server if this failed, no need to interrupt the user.
    }
  }

  function handleBubblePressStart(message) {
    reactLongPressFired.current = false;
    reactPressTimer.current = setTimeout(() => {
      reactLongPressFired.current = true;
      setReactingTo(message.id);
    }, LONG_PRESS_MS);
  }

  function handleBubblePressEnd() {
    clearTimeout(reactPressTimer.current);
  }

  async function handleClearChat() {
    if (!window.confirm('Clear this chat? This erases the messages from your view only, with no way to recover them.')) return;
    try {
      await ConversationsAPI.clear(conversationId);
      setMessages([]);
      setShowOptions(false);
    } catch (err) {
      setError(err.message || 'Could not clear chat.');
    }
  }

  async function handleBlockChat() {
    if (!conv?.other_user?.id) return;
    if (!window.confirm(`Block ${conv.other_user.full_name || 'this person'}? They won't be able to message or follow you.`)) return;
    try {
      await BlocksAPI.block(conv.other_user.id);
      setShowOptions(false);
      navigate('/inbox');
    } catch (err) {
      setError(err.message || 'Could not block this person.');
    }
  }

  return (
    <div className="screen conversation-screen" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: 'var(--sp-5) var(--sp-4) 0', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <button
            onClick={() => {
              if (window.history.length > 2) navigate(-1); else navigate('/inbox');
            }}
            aria-label="Go back"
            style={{
              width: 36, height: 36, minWidth: 36, borderRadius: '999px', border: '1.5px solid var(--line)',
              background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="var(--maroon-deep)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          {conv?.other_user?.id ? (
            <button
              type="button"
              onClick={() => navigate(`/profile/${conv.other_user.id}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ position: 'relative', width: 32, height: 32 }}>
                <div className="avatar-circle" style={{ width: 32, height: 32 }}>
                  {conv.other_user.avatar_url ? (
                    <img src={conv.other_user.avatar_url} alt="" />
                  ) : (
                    (conv.other_user.full_name || '?').charAt(0)
                  )}
                </div>
                {isOtherOnline && (
                  <span
                    aria-label="Online"
                    title="Online"
                    style={{
                      position: 'absolute', bottom: -1, right: -1, width: 10, height: 10,
                      borderRadius: '50%', background: '#4ade80', border: '2px solid var(--ivory)',
                    }}
                  />
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
                <h1 className="h-display" style={{ fontSize: 'var(--fs-xl)', margin: 0 }}>
                  {conv.other_user.full_name || 'Conversation'}
                </h1>
                {/* Live "online now" is instant (Supabase Presence). Once
                    they're no longer in that live set, fall back to the
                    heartbeat-backed last_seen_at — same "Active now" /
                    "Active Xm ago" pattern as Facebook/WhatsApp. */}
                {isOtherOnline ? (
                  <span style={{ fontSize: '0.6875rem', color: '#3ba55d', fontWeight: 600 }}>Active now</span>
                ) : formatLastSeen(conv.other_user.last_seen_at) ? (
                  <span style={{ fontSize: '0.6875rem', color: 'var(--ink-soft)' }}>
                    {formatLastSeen(conv.other_user.last_seen_at)}
                  </span>
                ) : null}
              </div>
            </button>
          ) : (
            <h1 className="h-display" style={{ fontSize: 'var(--fs-xl)', margin: 0 }}>
              {conv?.other_user?.full_name || 'Conversation'}
            </h1>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowOptions((v) => !v)}
          aria-label="Chat options"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, position: 'relative' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="5" cy="12" r="1.8" fill="var(--ink)" />
            <circle cx="12" cy="12" r="1.8" fill="var(--ink)" />
            <circle cx="19" cy="12" r="1.8" fill="var(--ink)" />
          </svg>
          {showOptions && (
            <div
              className="card"
              style={{
                position: 'absolute', top: '100%', right: 0, zIndex: 20, minWidth: 180,
                padding: 'var(--sp-2)', textAlign: 'left',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button type="button" className="post-action-link" style={{ display: 'block', width: '100%', padding: '8px 4px', textAlign: 'left' }} onClick={handleClearChat}>
                Clear chat
              </button>
              <button type="button" className="post-action-link" style={{ display: 'block', width: '100%', padding: '8px 4px', textAlign: 'left', color: 'var(--danger, #a33)' }} onClick={handleBlockChat}>
                Block chat
              </button>
              <button type="button" className="post-action-link" style={{ display: 'block', width: '100%', padding: '8px 4px', textAlign: 'left' }} onClick={() => { setShowOptions(false); setShowWallpaper(true); }}>
                Wallpaper
              </button>
            </div>
          )}
        </button>
      </div>

      {error && <div className="banner-error" style={{ margin: '0 var(--sp-4)' }}>{error}</div>}

      <div
        style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--sp-2) var(--sp-4)', ...wallpaperStyle }}
        onClick={() => { setShowOptions(false); setReactingTo(null); setShowStickerPicker(false); }}
      >
        {loading ? (
          <p style={{ color: isDarkBg ? '#fff' : 'var(--ink-soft)' }}>Loading…</p>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 'var(--sp-4)' }}>
            <p style={{ color: isDarkBg ? '#fff' : 'var(--ink-soft)' }}>
              {isRecipientOfPendingRequest ? 'This is a message request.' : 'Say hello.'}
            </p>
            {!isRecipientOfPendingRequest && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleSendSticker('wave'); }}
                style={{
                  marginTop: 'var(--sp-2)', border: '1.5px solid var(--line)', background: isDarkBg ? 'rgba(255,255,255,0.9)' : '#fff',
                  borderRadius: '999px', padding: '8px 18px', fontSize: '1.4rem', cursor: 'pointer',
                }}
                aria-label="Send a wave"
              >
                👋
              </button>
            )}
          </div>
        ) : (
          buildClusters(messages).map((cluster, ci) => {
            const mine = cluster.sender_id === user?.id;
            const lastMsg = cluster.messages[cluster.messages.length - 1];
            return (
              <div
                key={lastMsg.id}
                style={{
                  display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-end', gap: 6,
                  marginTop: ci === 0 ? 0 : 'var(--sp-3)', // real gap BETWEEN clusters
                  padding: '0 var(--sp-1)',
                }}
              >
                {/* Avatar only on the other person's side, only once
                    per cluster (anchored to the last/bottom bubble) —
                    not repeated on every message like a plain chat log. */}
                {!mine && (
                  <div className="avatar-circle" style={{ width: 24, height: 24, fontSize: '0.7rem', flexShrink: 0 }}>
                    {conv?.other_user?.avatar_url ? (
                      <img src={conv.other_user.avatar_url} alt="" />
                    ) : (
                      conv?.other_user?.full_name?.charAt(0) || '?'
                    )}
                  </div>
                )}

                <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', gap: 2, alignItems: mine ? 'flex-end' : 'flex-start' }}>
                  {cluster.messages.map((m, mi) => {
                    const isFirst = mi === 0;
                    const isLast = mi === cluster.messages.length - 1;
                    const emojiOnly = isEmojiOnlyMessage(m.content);

                    // Corner shaping: the "joined" edge between two
                    // consecutive bubbles from the same person flattens,
                    // same visual grammar as Messenger/IG clustering —
                    // only the outermost corners of the whole cluster
                    // stay fully rounded.
                    const radius = 'var(--radius-md)';
                    const flat = '4px';
                    const borderRadius = mine
                      ? `${isFirst ? radius : flat} ${radius} ${isLast ? radius : flat} ${radius}`
                      : `${radius} ${isFirst ? radius : flat} ${radius} ${isLast ? radius : flat}`;

                    const reactions = m.message_reactions || [];
                    const reactionCounts = reactions.reduce((acc, r) => {
                      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                      return acc;
                    }, {});
                    const myReaction = reactions.find((r) => r.user_id === user?.id)?.emoji;

                    const bubbleContent = m.type === 'voice' ? (
                      <VoiceMessage message={m} conversationId={conversationId} mine={mine} isDarkBg={isDarkBg} />
                    ) : m.type === 'sticker' ? (
                      <div style={{ fontSize: '2.8rem', lineHeight: 1.1 }}>{stickerEmoji(m.sticker_id)}</div>
                    ) : (
                      m.content
                    );

                    const useBubbleChrome = m.type === 'voice' || (m.type !== 'sticker' && !emojiOnly);

                    return (
                      <div key={m.id} style={{ position: 'relative' }}>
                        <div
                          onMouseDown={() => handleBubblePressStart(m)}
                          onMouseUp={handleBubblePressEnd}
                          onMouseLeave={handleBubblePressEnd}
                          onTouchStart={() => handleBubblePressStart(m)}
                          onTouchEnd={handleBubblePressEnd}
                          onClick={(e) => { if (reactLongPressFired.current) e.stopPropagation(); }}
                          style={useBubbleChrome ? {
                            padding: m.type === 'voice' ? '8px 10px' : '8px 12px', borderRadius,
                            background: mine ? 'var(--maroon)' : (isDarkBg ? 'rgba(255,255,255,0.92)' : 'var(--ivory-dim)'),
                            color: mine ? '#fff' : 'var(--ink)',
                            fontSize: 'var(--fs-sm)', cursor: 'pointer',
                          } : {
                            fontSize: '2.4rem', lineHeight: 1.1, textAlign: mine ? 'right' : 'left', cursor: 'pointer',
                          }}
                        >
                          {bubbleContent}
                        </div>

                        {/* Quick-react bar — opens on long-press, closed by
                            tapping a reaction, tapping elsewhere, or tapping
                            the same reaction again (which un-reacts). */}
                        {reactingTo === m.id && (
                          <div
                            className="card"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              position: 'absolute', bottom: '100%', marginBottom: 4, zIndex: 15,
                              [mine ? 'right' : 'left']: 0,
                              display: 'flex', gap: 4, padding: '4px 6px',
                            }}
                          >
                            {QUICK_REACTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                aria-label={emoji}
                                onClick={() => handleReact(m, emoji)}
                                style={{
                                  border: 'none', background: myReaction === emoji ? 'var(--ivory-dim)' : 'none',
                                  borderRadius: '999px', fontSize: '1.2rem', cursor: 'pointer', padding: 4,
                                }}
                              >
                                {REACTION_EMOJI[emoji]}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Reaction pills — aggregated per emoji, WhatsApp-
                            style, sitting on the corner of the bubble. */}
                        {Object.keys(reactionCounts).length > 0 && (
                          <div style={{
                            display: 'flex', gap: 2, marginTop: -6,
                            justifyContent: mine ? 'flex-end' : 'flex-start', position: 'relative', zIndex: 1,
                          }}>
                            {Object.entries(reactionCounts).map(([emoji, count]) => (
                              <span
                                key={emoji}
                                style={{
                                  background: '#fff', border: '1px solid var(--line)', borderRadius: '999px',
                                  fontSize: '0.6875rem', padding: '1px 5px', display: 'flex', alignItems: 'center', gap: 2,
                                }}
                              >
                                {REACTION_EMOJI[emoji]}{count > 1 ? count : ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Timestamp/read-receipt shown once per cluster, on
                      the last bubble — not repeated per message. */}
                  <div style={{
                    display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', gap: 4,
                    marginTop: 2, alignItems: 'center',
                  }}>
                    <span style={{ fontSize: '0.625rem', color: isDarkBg ? 'rgba(255,255,255,0.75)' : 'var(--ink-soft)' }}>
                      {timeLabel(lastMsg.created_at)}
                    </span>
                    {mine && (() => {
                      // Three real states: sent (row exists — always
                      // true here) -> delivered (reached the other
                      // device) -> read (they opened the thread).
                      // Delivered fires the instant the recipient's
                      // client receives it via realtime, wherever in
                      // the app they are — not delayed until they open
                      // this chat (see hooks/useIncomingMessages.js).
                      const status = lastMsg.read_at ? 'read' : lastMsg.delivered_at ? 'delivered' : 'sent';
                      const tickColor = status === 'read' ? '#4fa8e8' : (isDarkBg ? 'rgba(255,255,255,0.75)' : 'var(--ink-soft)');
                      return (
                        <span aria-label={status} title={status.charAt(0).toUpperCase() + status.slice(1)}>
                          <svg width="14" height="10" viewBox="0 0 16 10" fill="none">
                            <path d="M1 5l3 3L9 2" stroke={tickColor} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                            {status !== 'sent' && <path d="M6 5l3 3L15 2" stroke={tickColor} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />}
                          </svg>
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {isRecipientOfPendingRequest ? (
        <div style={{ padding: 'var(--sp-3) var(--sp-4)', borderTop: '1px solid var(--line)' }}>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)', marginBottom: 'var(--sp-2)' }}>
            Accept this message request to reply.
          </p>
          <button type="button" className="btn btn-primary btn-block" onClick={handleAccept}>
            Accept
          </button>
        </div>
      ) : (
        <>
          {otherTyping && (
            <div style={{ padding: '2px var(--sp-4)', fontSize: '0.6875rem', color: 'var(--ink-soft)', fontStyle: 'italic' }}>
              {conv?.other_user?.full_name ? `${conv.other_user.full_name} is typing…` : 'Typing…'}
            </div>
          )}
          <div className="message-composer" style={{ position: 'relative', alignItems: 'center' }}>
            {!isRecordingVoice && (
              <>
                <button
                  type="button"
                  aria-label="Stickers"
                  onClick={(e) => { e.stopPropagation(); setShowStickerPicker((v) => !v); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', padding: '4px 2px', flexShrink: 0, lineHeight: 1 }}
                >
                  😊
                </button>
                {showStickerPicker && (
                  <StickerPicker onPick={handleSendSticker} onClose={() => setShowStickerPicker(false)} />
                )}

                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Message…"
                  rows={1}
                  maxLength={2000}
                />
              </>
            )}

            {draft.trim() ? (
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '10px 16px' }}
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? '…' : 'Send'}
              </button>
            ) : (
              <VoiceRecorder
                conversationId={conversationId}
                onSent={handleVoiceSent}
                onError={(msg) => setError(msg)}
                onRecordingChange={setIsRecordingVoice}
              />
            )}
          </div>
        </>
      )}

      {showWallpaper && (
        <WallpaperModal
          conversationId={conversationId}
          currentWallpaper={wallpaperKey}
          onClose={() => setShowWallpaper(false)}
          onSaved={(next) => setConv((c) => (c ? { ...c, ...next } : c))}
        />
      )}
    </div>
  );
}
