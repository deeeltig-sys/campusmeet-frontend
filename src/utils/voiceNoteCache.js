// Caches voice note audio on the PHONE (browser Cache API — real
// binary storage, not localStorage/sessionStorage) so replaying a
// voice note never re-downloads it from Supabase. This is the direct
// counterpart to WhatsApp storing media locally, just scoped to a
// hard cap instead of growing forever like WhatsApp's does.
//
// The 70MB budget is enforced here, client-side, PER BROWSER PROFILE
// (not synced across a student's phone + laptop — each is its own
// cache). A lightweight index of {messageId, size, lastAccessed} is
// kept in localStorage (just numbers/strings, not the audio itself)
// so eviction can pick the actual least-recently-PLAYED note without
// having to open and inspect the Cache API on every check.

const CACHE_NAME = 'campmeet-voice-notes-v1';
const INDEX_KEY = 'campmeet_voice_cache_index';
const MAX_BYTES = 70 * 1024 * 1024; // 70MB
const cacheKeyFor = (messageId) => `/voice-cache/${messageId}`;

function readIndex() {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeIndex(index) {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  } catch {
    // Storage full or unavailable (private browsing) — cache still
    // works for the current session via Cache API itself, this index
    // just loses accurate LRU ordering, not a functional break.
  }
}

function totalBytes(index) {
  return Object.values(index).reduce((sum, entry) => sum + (entry.size || 0), 0);
}

async function evictUntilUnderCap(index, incomingBytes) {
  if (!('caches' in window)) return index;
  const cache = await caches.open(CACHE_NAME);

  const entries = Object.entries(index).sort((a, b) => a[1].lastAccessed - b[1].lastAccessed); // oldest first
  let i = 0;
  while (totalBytes(index) + incomingBytes > MAX_BYTES && i < entries.length) {
    const [messageId] = entries[i];
    await cache.delete(cacheKeyFor(messageId)).catch(() => {});
    delete index[messageId];
    i += 1;
  }
  return index;
}

/** Returns a playable object URL from the phone cache, or null if this voice note isn't cached (yet, or was evicted). */
export async function getCachedVoiceUrl(messageId) {
  if (!('caches' in window)) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(cacheKeyFor(messageId));
    if (!match) return null;

    const index = readIndex();
    if (index[messageId]) {
      index[messageId].lastAccessed = Date.now(); // bump LRU recency on every actual play
      writeIndex(index);
    }

    const blob = await match.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

/** Downloads from the given signed URL, stores it in the phone cache (evicting oldest entries first if needed to stay under 70MB), and returns a playable object URL. */
export async function fetchAndCacheVoice(messageId, signedUrl) {
  const response = await fetch(signedUrl);
  if (!response.ok) throw new Error('Could not download voice note.');
  const blob = await response.blob();

  if ('caches' in window) {
    try {
      const size = blob.size;
      let index = readIndex();
      index = await evictUntilUnderCap(index, size);

      const cache = await caches.open(CACHE_NAME);
      await cache.put(cacheKeyFor(messageId), new Response(blob, { headers: { 'Content-Type': blob.type } }));

      index[messageId] = { size, lastAccessed: Date.now() };
      writeIndex(index);
    } catch {
      // Caching is a nice-to-have — playback below still works from
      // the in-memory blob even if persisting it to disk failed.
    }
  }

  return URL.createObjectURL(blob);
}
