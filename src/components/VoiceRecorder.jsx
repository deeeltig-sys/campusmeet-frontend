import { useRef, useState, useCallback } from 'react';
import { ConversationsAPI } from '../api/client';

// How far (px) a press has to slide left before it counts as
// "slide to cancel" — matches the WhatsApp gesture, tuned for touch.
const CANCEL_SLIDE_PX = 80;
// How far (px) a press has to slide UP before it locks into
// hands-free continued recording (release without stopping).
const LOCK_SLIDE_PX = 60;
const MAX_RECORDING_MS = 5 * 60 * 1000; // 5 minutes, sane upper bound
const MIN_RECORDING_MS = 500; // below this, treat release as an accidental tap, discard

function pickMimeType() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  for (const type of candidates) {
    if (window.MediaRecorder?.isTypeSupported?.(type)) return type;
  }
  return '';
}

/**
 * Renders just the mic button; recording UI (waveform/timer/cancel)
 * takes over the composer row while active via onRecordingChange so
 * the parent can swap the layout without this component needing to
 * know about the rest of the composer.
 */
export default function VoiceRecorder({ conversationId, onSent, onError, onRecordingChange, disabled }) {
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [level, setLevel] = useState(0); // 0-1, current mic amplitude for the live waveform bar
  const [dragX, setDragX] = useState(0);
  const [locked, setLocked] = useState(false);
  const [uploading, setUploading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const startTimeRef = useRef(0);
  const timerRef = useRef(null);
  const waveformRef = useRef([]);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const cancelledRef = useRef(false);

  const cleanupStream = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
  }, []);

  const sampleLevel = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length); // 0..~1
    setLevel(rms);
    // Keep a bounded amplitude history for the sent waveform — sampled
    // roughly every animation frame is too dense, throttle via the
    // interval below instead of pushing here on every rAF tick.
    rafRef.current = requestAnimationFrame(sampleLevel);
  }, []);

  const startRecording = useCallback(async () => {
    if (disabled || recording || uploading) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContextCtor();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      waveformRef.current = [];
      cancelledRef.current = false;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();
      setElapsedMs(0);
      setDragX(0);
      setLocked(false);
      setRecording(true);
      onRecordingChange?.(true);

      rafRef.current = requestAnimationFrame(sampleLevel);
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setElapsedMs(elapsed);
        // One coarse waveform sample every ~150ms — plenty of detail
        // for a static post-hoc waveform without storing hundreds of
        // points (backend caps this list at 200 entries).
        if (analyserRef.current) {
          const data = new Uint8Array(analyserRef.current.fftSize);
          analyserRef.current.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          waveformRef.current.push(Math.min(1, Math.sqrt(sum / data.length) * 3));
        }
        if (elapsed >= MAX_RECORDING_MS) {
          stopAndSend();
        }
      }, 150);
    } catch (err) {
      onError?.('Microphone access is needed to record a voice note.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, recording, uploading]);

  const finishRecording = useCallback(() => new Promise((resolve) => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') { resolve(null); return; }
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      resolve(blob);
    };
    recorder.stop();
  }), []);

  const reset = useCallback(() => {
    setRecording(false);
    setElapsedMs(0);
    setLevel(0);
    setDragX(0);
    setLocked(false);
    onRecordingChange?.(false);
    cleanupStream();
  }, [cleanupStream, onRecordingChange]);

  const stopAndCancel = useCallback(async () => {
    cancelledRef.current = true;
    await finishRecording();
    reset();
  }, [finishRecording, reset]);

  const stopAndSend = useCallback(async () => {
    const durationMs = Date.now() - startTimeRef.current;
    const blob = await finishRecording();
    const waveform = waveformRef.current.slice();
    reset();

    if (cancelledRef.current) return;
    if (!blob || durationMs < MIN_RECORDING_MS) return; // accidental tap — discard silently, matches WhatsApp behavior

    setUploading(true);
    try {
      const msg = await ConversationsAPI.sendVoice(conversationId, blob, durationMs, waveform);
      onSent?.(msg);
    } catch (err) {
      onError?.(err.message || 'Voice note failed to send.');
    } finally {
      setUploading(false);
    }
  }, [conversationId, finishRecording, reset, onSent, onError]);

  function handlePressStart(e) {
    const point = e.touches ? e.touches[0] : e;
    startXRef.current = point.clientX;
    startYRef.current = point.clientY;
    startRecording();
  }

  function handlePressMove(e) {
    if (!recording || locked) return;
    const point = e.touches ? e.touches[0] : e;
    const dx = point.clientX - startXRef.current;
    const dy = point.clientY - startYRef.current;

    if (dy < -LOCK_SLIDE_PX) {
      setLocked(true); // hands-free — recording continues until Stop is tapped
      return;
    }
    if (dx < 0) {
      setDragX(dx);
      if (dx < -CANCEL_SLIDE_PX) {
        stopAndCancel();
      }
    }
  }

  function handlePressEnd() {
    if (!recording || locked) return; // locked recordings only stop via the explicit Stop button
    stopAndSend();
  }

  if (recording) {
    const seconds = Math.floor(elapsedMs / 1000);
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    const cancelProgress = Math.min(1, Math.abs(dragX) / CANCEL_SLIDE_PX);

    return (
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, touchAction: 'none' }}
        onMouseMove={handlePressMove}
        onMouseUp={handlePressEnd}
        onMouseLeave={locked ? undefined : handlePressEnd}
        onTouchMove={handlePressMove}
        onTouchEnd={handlePressEnd}
      >
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#e53e3e', flexShrink: 0, animation: 'campmeet-rec-pulse 1s infinite' }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--ink)', flexShrink: 0 }}>{mm}:{ss}</span>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2, height: 24, minWidth: 0, opacity: 1 - cancelProgress * 0.6 }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <span
              key={i}
              style={{
                width: 3, borderRadius: 2, background: 'var(--maroon)',
                height: Math.max(3, (i % 5 === 0 ? level * 22 : level * 14 * Math.random())),
                transition: 'height 100ms ease',
              }}
            />
          ))}
        </div>

        {!locked ? (
          <span style={{ fontSize: '0.6875rem', color: 'var(--ink-soft)', flexShrink: 0, whiteSpace: 'nowrap' }}>
            {'< Slide to cancel'}
          </span>
        ) : (
          <button type="button" className="post-action-link" style={{ flexShrink: 0, fontSize: '0.75rem' }} onClick={stopAndCancel}>
            Cancel
          </button>
        )}

        <button
          type="button"
          aria-label={locked ? 'Send voice note' : 'Release to send'}
          onClick={locked ? stopAndSend : undefined}
          style={{
            width: 36, height: 36, minWidth: 36, borderRadius: '999px', border: 'none',
            background: 'var(--maroon)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: locked ? 'pointer' : 'default', flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M4 12l16-8-6 16-3-7-7-1z" fill="#fff" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label="Hold to record a voice note"
      disabled={disabled || uploading}
      onMouseDown={handlePressStart}
      onTouchStart={handlePressStart}
      style={{
        width: 40, height: 40, minWidth: 40, borderRadius: '999px', border: 'none',
        background: uploading ? 'var(--line)' : 'var(--maroon)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', cursor: disabled || uploading ? 'default' : 'pointer', flexShrink: 0,
        touchAction: 'none',
      }}
    >
      {uploading ? (
        <span style={{ fontSize: '0.7rem', color: '#fff' }}>…</span>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="9" y="2" width="6" height="12" rx="3" fill="#fff" />
          <path d="M5 11a7 7 0 0014 0M12 18v3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}
