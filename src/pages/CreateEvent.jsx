import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { EventsAPI } from '../api/client';
import BackHeader from '../components/BackHeader';

export default function CreateEvent() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startAt, setStartAt] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { state } = useLocation();
  const groupId = state?.groupId;

  async function handleSubmit(e) {
    e.preventDefault();
    if (title.trim().length < 2) {
      setError('Event title must be at least 2 characters.');
      return;
    }
    if (!startAt) {
      setError('Pick a date and time.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const event = await EventsAPI.create({
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        start_at: new Date(startAt).toISOString(),
        group_id: groupId || undefined,
      });
      navigate(`/events/${event.id}`);
    } catch (err) {
      setError(err.message || "That event wasn't created. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <BackHeader eyebrow="New event" title="Bring campus together" fallback="/events" />

      {error && <div className="banner-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="title">Event title</label>
          <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Career Fair 2026" />
        </div>

        <div className="field">
          <label htmlFor="start_at">Date and time</label>
          <input id="start_at" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="location">Location (optional)</label>
          <input id="location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} placeholder="e.g. Great Hall" />
        </div>

        <div className="field">
          <label htmlFor="description">Description (optional)</label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            placeholder="What's happening?"
            style={{ resize: 'vertical', fontFamily: 'var(--font-body)' }}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={busy || title.trim().length < 2 || !startAt}>
          {busy ? 'Creating…' : 'Create event'}
        </button>
      </form>
    </div>
  );
}
