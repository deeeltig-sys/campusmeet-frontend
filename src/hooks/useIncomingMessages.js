import { useEffect, useRef } from 'react';
import { getRealtimeClient, realtimeAvailable, syncRealtimeAuth } from '../lib/realtimeClient';
import { ConversationsAPI } from '../api/client';

/**
 * Subscribes to new-row INSERTs on `messages` sent by anyone TO the
 * given user (sender_id != userId), across every conversation the RLS
 * policy allows them to see. Calls onMessage(row) for each one.
 *
 * No-ops cleanly if userId is falsy or realtime isn't configured
 * (missing VITE_SUPABASE_URL/ANON_KEY) — callers should keep whatever
 * polling fallback they already had; this is a "make it feel instant
 * when available" layer, not a replacement for that safety net.
 *
 * Also fires the delivery ack the INSTANT a message reaches this
 * client, from wherever in the app the user currently is — this is
 * mounted app-wide (BottomNav + Inbox), so it's the one place that's
 * guaranteed to see every incoming message regardless of whether the
 * recipient has that specific thread open. That's what makes the
 * sender's double tick appear right away instead of waiting for the
 * recipient to open the chat (read_at is what waits for that).
 */
export function useIncomingMessages(userId, onMessage) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!userId || !realtimeAvailable) return;
    const client = getRealtimeClient();
    if (!client) return;

    let channel = null;
    try {
      syncRealtimeAuth();
      channel = client
        .channel(`incoming-messages-${userId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages' },
          (payload) => {
            const row = payload.new;
            // Realtime's column filter only supports one eq condition,
            // and "sender isn't me" is a not-equal — so filter client-side
            // instead. RLS already limits what actually reaches us to
            // messages in conversations this user is part of.
            if (row && row.sender_id !== userId) {
              onMessageRef.current?.(row);
              // Fire-and-forget: a missed delivery ping just means the
              // read receipt catches it later when the thread opens, so
              // this deliberately doesn't block or surface errors.
              ConversationsAPI.markDelivered(row.conversation_id, [row.id]).catch(() => {});
            }
          },
        )
        .subscribe();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Realtime subscription failed — polling fallback still covers this:', err);
    }

    return () => {
      if (channel) client.removeChannel(channel);
    };
  }, [userId]);
}

/**
 * Subscribes to new messages AND receipt/reaction updates within one
 * specific conversation (used by the open chat thread to append live
 * instead of re-polling, and to flip ticks the instant the OTHER side
 * marks delivered/read — not just on the next 4s poll). No-ops the
 * same way as useIncomingMessages when realtime isn't configured.
 *
 * onUpdate is optional — existing callers that only pass onMessage
 * keep working exactly as before.
 */
export function useConversationMessages(conversationId, onMessage, onUpdate) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!conversationId || !realtimeAvailable) return;
    const client = getRealtimeClient();
    if (!client) return;

    let channel = null;
    try {
      syncRealtimeAuth();
      channel = client
        .channel(`conversation-${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT', schema: 'public', table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => onMessageRef.current?.(payload.new),
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE', schema: 'public', table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => onUpdateRef.current?.(payload.new),
        )
        .subscribe();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Realtime subscription failed — polling fallback still covers this:', err);
    }

    return () => {
      if (channel) client.removeChannel(channel);
    };
  }, [conversationId]);
}
