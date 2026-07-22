import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ConversationsAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import BackHeader from '../components/BackHeader';

export default function Conversation() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [conv, setConv] = useState(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const [msgs, convs] = await Promise.all([
        ConversationsAPI.messages(conversationId),
        ConversationsAPI.list(),
      ]);
      setMessages(Array.isArray(msgs) ? msgs : []);
      setConv((convs || []).find((c) => c.id === conversationId) || null);
    } catch (err) {
      setError(err.message || 'Could not load this conversation.');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // isRecipientOfPendingRequest = true when this is someone else's
  // message request waiting on me to accept before I can reply — the
  // actual gate is enforced server-side (RLS on messages insert), this
  // just drives whether the composer or the Accept button shows.
  const isRecipientOfPendingRequest = conv?.is_request;

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
    } catch (err) {
      setError(err.message || 'Could not send — you may need to accept this conversation first.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: 'var(--sp-5) var(--sp-4) 0' }}>
        <BackHeader
          fallback="/inbox"
          title={conv?.other_user?.full_name || 'Conversation'}
        />
      </div>

      {error && <div className="banner-error" style={{ margin: '0 var(--sp-4)' }}>{error}</div>}

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--sp-2) var(--sp-4)' }}>
        {loading ? (
          <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
        ) : messages.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)', textAlign: 'center' }}>
            {isRecipientOfPendingRequest ? 'This is a message request.' : 'Say hello.'}
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start',
                  marginBottom: 'var(--sp-2)', padding: '0 var(--sp-1)',
                }}
              >
                <div
                  style={{
                    maxWidth: '75%', padding: '8px 12px', borderRadius: 'var(--radius-md)',
                    background: mine ? 'var(--maroon)' : 'var(--ivory-dim)',
                    color: mine ? '#fff' : 'inherit',
                    fontSize: 'var(--fs-sm)',
                  }}
                >
                  {m.content}
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
        <div className="comment-composer">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message…"
            rows={1}
            maxLength={2000}
          />
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '10px 16px' }}
            onClick={handleSend}
            disabled={sending || !draft.trim()}
          >
            {sending ? '…' : 'Send'}
          </button>
        </div>
      )}
    </div>
  );
}
