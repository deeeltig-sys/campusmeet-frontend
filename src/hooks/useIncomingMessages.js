import { useEffect, useRef } from 'react';
import { getRealtimeClient, realtimeAvailable, syncRealtimeAuth } from '../lib/realtimeClient';

/**
 * Subscribes to new-row INSERTs on `messages` sent by anyone TO the
 * given user (sender_id != userId), across every conversation the RLS
 * policy allows them to see. Calls onMessage(row) for each one.
 *
 * No-ops cleanly if userId is falsy or realtime isn't configured
 * (missing VITE_SUPABASE_URL/ANON_KEY) — callers should keep whatever
 * polling fallback they already had; this is a "make it feel instant
 * when available" layer, not a replacement for that safety net.
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
 * Subscribes to new messages within one specific conversation (both
 * directions — used by the open chat thread to append live instead of
 * re-polling). No-ops the same way as useIncomingMessages when
 * realtime isn't configured.
 */
export function useConversationMessages(conversationId, onMessage) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

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
