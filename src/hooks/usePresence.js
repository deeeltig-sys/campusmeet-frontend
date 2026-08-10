import { useEffect, useState } from 'react';
import { getRealtimeClient, syncRealtimeAuth, realtimeAvailable } from '../lib/realtimeClient';

// Supabase Presence, not postgres_changes — a genuinely different
// mechanism from everything else in realtimeClient.js/
// useIncomingMessages.js, which only ever subscribe to row INSERTs.
// Presence tracks who's connected to a shared channel right now, no
// database table involved at all — closer to "who's in this Zoom
// call" than "what changed in this table". This didn't exist before;
// there was nothing here to "wire up" for online dots, only the
// message-insert plumbing that presence is unrelated to.
//
// One shared channel for the whole app rather than one per component
// (an online dot on every Inbox row would otherwise open a separate
// presence channel per row) — a tiny pub-sub store here lets any
// number of components read the same live online-set cheaply.

const CHANNEL_NAME = 'campusmeet:presence';
let channel = null;
let onlineIds = new Set();
let listeners = [];

function notify() {
  const snapshot = new Set(onlineIds);
  listeners.forEach((fn) => fn(snapshot));
}

function rebuildFromPresenceState(state) {
  // Supabase's presenceState() shape: { [key]: [{ user_id, ...}, ...] }
  // — a key can have multiple entries if someone has the app open in
  // more than one tab, so this just needs "is this user_id present at
  // all", not a count.
  const next = new Set();
  Object.values(state).forEach((entries) => {
    entries.forEach((entry) => {
      if (entry?.user_id) next.add(entry.user_id);
    });
  });
  onlineIds = next;
  notify();
}

/** Call once, near app root, once a real logged-in user_id is known.
 * Safe to call again with the same id (no-ops if already tracking) or
 * with null (tears the channel down, e.g. on logout). */
export function initPresence(userId) {
  if (!realtimeAvailable) return;
  const client = getRealtimeClient();
  if (!client) return;

  if (!userId) {
    if (channel) {
      client.removeChannel(channel);
      channel = null;
      onlineIds = new Set();
      notify();
    }
    return;
  }

  if (channel) return; // already tracking this session

  syncRealtimeAuth();
  channel = client.channel(CHANNEL_NAME, { config: { presence: { key: userId } } });

  channel
    .on('presence', { event: 'sync' }, () => rebuildFromPresenceState(channel.presenceState()))
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: userId, online_at: new Date().toISOString() });
      }
    });
}

export function teardownPresence() {
  initPresence(null);
}

/** Returns a live Set of currently-online user ids. Re-renders the
 * calling component whenever presence changes anywhere in the app —
 * cheap because every consumer shares the one channel above rather
 * than each opening its own. */
export function usePresence() {
  const [ids, setIds] = useState(onlineIds);
  useEffect(() => {
    listeners.push(setIds);
    setIds(new Set(onlineIds)); // catch up in case sync already happened before mount
    return () => { listeners = listeners.filter((fn) => fn !== setIds); };
  }, []);
  return ids;
}

export function useIsOnline(userId) {
  const ids = usePresence();
  return userId ? ids.has(userId) : false;
}
