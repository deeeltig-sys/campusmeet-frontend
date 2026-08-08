import { createClient } from '@supabase/supabase-js';
import { getToken } from '../api/client';

// This client exists ONLY for Realtime (postgres_changes) subscriptions.
// All normal reads/writes still go through the Flask backend exactly as
// before — nothing about the REST API layer changes. That also means
// this client deliberately does NOT manage its own auth session
// (persistSession/autoRefreshToken are off); it borrows the same
// access token the rest of the app already holds via getToken(), and
// re-applies it to the realtime socket right before subscribing.
//
// Requires two env vars at build time (Vite only exposes VITE_-prefixed
// vars to the client bundle): VITE_SUPABASE_URL and
// VITE_SUPABASE_ANON_KEY — the same anon key already used by the
// backend's SUPABASE_ANON_KEY, safe to expose client-side by design.
// If either is missing OR malformed, realtime is simply unavailable
// and every hook in useIncomingMessages.js no-ops instead of throwing,
// so the app still works exactly as it did before (existing polling
// keeps covering for it). This used to call createClient() unguarded
// at module scope — a stray space/newline from pasting the value into
// Netlify's UI made the URL constructor throw, which crashed the
// ENTIRE app (this module is imported by BottomNav, which is on every
// page) via the global ErrorBoundary in main.jsx. Trimmed + try/catch
// now, specifically so a bad env value degrades to "no realtime"
// instead of "no app".
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

let client = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Realtime client failed to initialize — falling back to polling only:', err);
    client = null;
  }
}

export const realtimeAvailable = client !== null;

/** Re-applies the current access token to the realtime socket. Call
 * this right before opening a new subscription — access tokens expire
 * in ~1hr (see api/client.js's silent refresh), and a channel opened
 * with a stale token would have RLS reject every row. */
export function syncRealtimeAuth() {
  if (!client) return;
  const token = getToken();
  if (!token) return;
  try {
    client.realtime.setAuth(token);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Realtime auth sync failed:', err);
  }
}

export function getRealtimeClient() {
  return client;
}
