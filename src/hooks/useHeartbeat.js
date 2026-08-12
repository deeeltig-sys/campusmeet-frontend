import { useEffect } from 'react';
import { ProfileAPI } from '../api/client';

// How often to refresh last_seen_at while the tab is actually visible.
// Doesn't need to be frequent — this only backs the OFFLINE "Active
// Xm ago" text; live "online now" is a separate, instant mechanism
// (Supabase Presence, see hooks/usePresence.js).
const HEARTBEAT_INTERVAL_MS = 60_000;

/**
 * Mounted once at the app root (see App.jsx, alongside initPresence),
 * for the CURRENT logged-in user only. Pings immediately, then every
 * 60s while the tab is visible, and again whenever the tab regains
 * focus after being hidden (covers "closed the phone for 20 minutes,
 * reopened the app" without waiting up to 60s for the next tick).
 */
export function useHeartbeat(userId) {
  useEffect(() => {
    if (!userId) return;

    const ping = () => {
      if (document.visibilityState !== 'visible') return;
      ProfileAPI.heartbeat().catch(() => {
        // Silent by design — a missed heartbeat just leaves
        // last_seen_at slightly stale until the next successful one.
      });
    };

    ping();
    const interval = setInterval(ping, HEARTBEAT_INTERVAL_MS);
    document.addEventListener('visibilitychange', ping);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', ping);
    };
  }, [userId]);
}
