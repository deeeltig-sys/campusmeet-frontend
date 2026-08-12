import { useRef, useState, useEffect } from 'react';
import { ConversationsAPI } from '../api/client';
import { getCachedVoiceUrl, fetchAndCacheVoice } from '../utils/voiceNoteCache';

const SPEEDS = [1, 1.5, 2];

function formatDuration(ms) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

// Module-level registry so starting one voice note pauses any other
// that's currently playing — WhatsApp/IG never play two at once.
let currentlyPlayingAudio = null;

export default function VoiceMessage({ message, conversationId, mine, isDarkBg }) {
  const audioRef = useRef(null);
  const objectUrlRef = useRef(null); // created from a Blob (cache hit or fresh download) — must be revoked on unmount
  const [playableUrl, setPlayableUrl] = useState(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progressMs, setProgressMs] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [error, setError] = useState(false);

  const durationMs = message.voice_duration_ms || 0;
  const waveform = Array.isArray(message.voice_waveform) && message.voice_waveform.length
    ? message.voice_waveform
    : Array.from({ length: 24 }, () => 0.3); // flat placeholder if no analysis was captured client-side

  useEffect(() => () => {
    if (audioRef.current) {
      audioRef.current.pause();
      if (currentlyPlayingAudio === audioRef.current) currentlyPlayingAudio = null;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  // Phone-cache-first: a replay never touches Supabase at all once a
  // note has been played once on this device (mirrors WhatsApp's
  // local playback) — only a genuine first play, or a note evicted by
  // the 70MB cap, goes back to the network. Voice notes also
  // self-delete from Supabase after 5 days server-side (see
  // routes/messages.py) — after that, even a cache miss can't recover
  // it and this surfaces as an error.
  async function ensurePlayableUrl() {
    if (playableUrl) return playableUrl;
    setLoadingUrl(true);
    setError(false);
    try {
      const cached = await getCachedVoiceUrl(message.id);
      if (cached) {
        objectUrlRef.current = cached;
        setPlayableUrl(cached);
        return cached;
      }

      const res = await ConversationsAPI.getVoiceUrl(conversationId, message.id);
      const cachedAfterDownload = await fetchAndCacheVoice(message.id, res.url);
      objectUrlRef.current = cachedAfterDownload;
      setPlayableUrl(cachedAfterDownload);
      return cachedAfterDownload;
    } catch {
      setError(true);
      return null;
    } finally {
      setLoadingUrl(false);
    }
  }

  async function togglePlay() {
    if (playing) {
      audioRef.current?.pause();
      return;
    }
    const url = await ensurePlayableUrl();
    if (!url) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.playbackRate = SPEEDS[speedIndex];
      audioRef.current.addEventListener('timeupdate', () => {
        setProgressMs(audioRef.current.currentTime * 1000);
      });
      audioRef.current.addEventListener('ended', () => {
        setPlaying(false);
        setProgressMs(0);
      });
      audioRef.current.addEventListener('error', () => setError(true));
    }

    if (currentlyPlayingAudio && currentlyPlayingAudio !== audioRef.current) {
      currentlyPlayingAudio.pause();
    }
    currentlyPlayingAudio = audioRef.current;
    audioRef.current.play().catch(() => setError(true));
    setPlaying(true);
  }

  function cycleSpeed() {
    const next = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(next);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPause = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('play', onPlay);
    return () => {
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('play', onPlay);
    };
  }, [playableUrl]);

  const progressRatio = durationMs > 0 ? Math.min(1, progressMs / durationMs) : 0;
  const playedBars = Math.round(progressRatio * waveform.length);
  const accent = mine ? '#fff' : 'var(--maroon)';
  const track = mine ? 'rgba(255,255,255,0.45)' : (isDarkBg ? 'rgba(0,0,0,0.25)' : 'rgba(122,45,45,0.25)');

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 200 }}>
      <button
        type="button"
        aria-label={playing ? 'Pause voice note' : 'Play voice note'}
        onClick={togglePlay}
        disabled={loadingUrl}
        style={{
          width: 30, height: 30, minWidth: 30, borderRadius: '50%', border: 'none',
          background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: loadingUrl ? 'default' : 'pointer',
        }}
      >
        {loadingUrl ? (
          <span style={{ fontSize: '0.6rem', color: mine ? 'var(--maroon)' : '#fff' }}>…</span>
        ) : playing ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <rect x="5" y="4" width="5" height="16" rx="1.5" fill={mine ? 'var(--maroon)' : '#fff'} />
            <rect x="14" y="4" width="5" height="16" rx="1.5" fill={mine ? 'var(--maroon)' : '#fff'} />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M6 4l14 8-14 8V4z" fill={mine ? 'var(--maroon)' : '#fff'} />
          </svg>
        )}
      </button>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2, height: 22, minWidth: 90 }}>
        {waveform.map((amp, i) => (
          <span
            key={i}
            style={{
              width: 2.5, borderRadius: 2, flexShrink: 0,
              height: Math.max(3, amp * 20),
              background: i < playedBars ? accent : track,
            }}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={cycleSpeed}
        style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.6rem', border: 'none', background: 'transparent',
          color: mine ? 'rgba(255,255,255,0.85)' : 'var(--ink-soft)', cursor: 'pointer', padding: '2px 4px', flexShrink: 0,
        }}
        aria-label="Change playback speed"
      >
        {SPEEDS[speedIndex]}x
      </button>

      <span style={{ fontSize: '0.625rem', fontFamily: 'var(--font-mono)', color: mine ? 'rgba(255,255,255,0.85)' : 'var(--ink-soft)', flexShrink: 0 }}>
        {error ? '!' : formatDuration(playing || progressMs > 0 ? Math.max(0, durationMs - progressMs) : durationMs)}
      </span>
    </div>
  );
}
