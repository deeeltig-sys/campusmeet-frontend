import { useEffect, useRef, useState } from 'react';
import { ConversationsAPI } from '../api/client';

// Session-lifetime cache of signed URLs, keyed by message id — a
// signed URL is valid for an hour server-side (see
// ATTACHMENT_SIGNED_URL_TTL_SECONDS in routes/messages.py), so
// re-fetching it on every re-render/scroll-back-into-view would be
// wasted round trips for something that hasn't actually expired.
const urlCache = new Map();

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const DOC_EXTENSIONS_BY_MIME = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOC',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPT',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLS',
  'text/plain': 'TXT',
  'application/zip': 'ZIP',
};

function FileIcon({ mime }) {
  if (mime?.startsWith('audio/')) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M9 18V5l12-2v13" stroke="var(--maroon)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="6" cy="18" r="3" stroke="var(--maroon)" strokeWidth="1.8" />
        <circle cx="18" cy="16" r="3" stroke="var(--maroon)" strokeWidth="1.8" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M6 2h9l5 5v15H6V2z" stroke="var(--maroon)" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M15 2v5h5" stroke="var(--maroon)" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export default function AttachmentMessage({ message, conversationId, mine }) {
  const [url, setUrl] = useState(urlCache.get(message.id) || null);
  const [loading, setLoading] = useState(!urlCache.has(message.id));
  const [error, setError] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (url) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    ConversationsAPI.getAttachmentUrl(conversationId, message.id)
      .then((res) => {
        if (cancelled) return;
        urlCache.set(message.id, res.url);
        setUrl(res.url);
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.id, conversationId]);

  const mime = message.attachment_mime || '';
  const name = message.attachment_name || 'Attachment';
  const size = formatBytes(message.attachment_size);

  if (message.type === 'image') {
    if (error) {
      return <div className="attachment-image-loading">Couldn't load photo</div>;
    }
    if (loading || !url) {
      return <div className="attachment-image-loading">Loading…</div>;
    }
    return (
      <a href={url} target="_blank" rel="noreferrer">
        <img src={url} alt={name} className="attachment-image" />
      </a>
    );
  }

  // Audio file sent as an attachment (not the hold-to-record voice
  // note, which uses VoiceMessage.jsx's own waveform player).
  if (mime.startsWith('audio/')) {
    return (
      <div className="attachment-file-chip">
        <div className="attachment-file-icon"><FileIcon mime={mime} /></div>
        <div className="attachment-file-meta" style={{ flex: 1 }}>
          <span className="attachment-file-name">{name}</span>
          {url && !loading && (
            <audio ref={audioRef} controls src={url} style={{ width: '100%', height: 28 }} />
          )}
          {loading && <span className="attachment-file-size">Loading…</span>}
          {error && <span className="attachment-file-size">Couldn't load audio</span>}
        </div>
      </div>
    );
  }

  return (
    <a
      href={loading || error ? undefined : url}
      target="_blank"
      rel="noreferrer"
      className="attachment-file-chip"
      style={{ color: 'inherit', textDecoration: 'none', cursor: loading ? 'default' : 'pointer' }}
    >
      <div className="attachment-file-icon"><FileIcon mime={mime} /></div>
      <div className="attachment-file-meta">
        <span className="attachment-file-name">{name}</span>
        <span className="attachment-file-size">
          {error ? "Couldn't load" : loading ? 'Loading…' : `${DOC_EXTENSIONS_BY_MIME[mime] || 'FILE'} · ${size}`}
        </span>
      </div>
    </a>
  );
}
