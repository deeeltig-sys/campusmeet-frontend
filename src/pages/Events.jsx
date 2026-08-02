import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { EventsAPI } from '../api/client';
import BackHeader from '../components/BackHeader';

function formatWhen(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function EventRow({ event, onRsvpToggle }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  async function handleGoing(e) {
    e.stopPropagation();
    setBusy(true);
    try {
      await onRsvpToggle(event, 'going');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => navigate(`/events/${event.id}`)}
      className="card"
      style={{ display: 'flex', gap: 'var(--sp-3)', width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left', marginBottom: 'var(--sp-2)' }}
    >
      <div style={{
        width: 52, flexShrink: 0, borderRadius: 10, background: 'var(--maroon-light)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6px 0',
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--maroon-deep)', textTransform: 'uppercase' }}>
          {new Date(event.start_at).toLocaleString(undefined, { month: 'short' })}
        </span>
        <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--maroon-deep)' }}>
          {new Date(event.start_at).getDate()}
        </strong>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ fontSize: 'var(--fs-sm)' }}>{event.title}</strong>
        <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', margin: '2px 0' }}>{formatWhen(event.start_at)}</p>
        {event.location && (
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', margin: 0 }}>{event.location}</p>
        )}
        <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--ink-soft)', margin: '4px 0 0' }}>
          {event.going_count} going · {event.interested_count} interested
        </p>
      </div>
      <button
        type="button"
        onClick={handleGoing}
        disabled={busy}
        className={event.my_rsvp === 'going' ? 'btn btn-primary' : 'btn'}
        style={{ fontSize: 'var(--fs-xs)', padding: '6px 12px', alignSelf: 'center', flexShrink: 0 }}
      >
        {event.my_rsvp === 'going' ? 'Going ✓' : 'Going?'}
      </button>
    </button>
  );
}

export default function Events() {
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('group_id');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = groupId ? await EventsAPI.listForGroup(groupId) : await EventsAPI.list();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Could not load events.');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  async function handleRsvpToggle(event, status) {
    const wasSame = event.my_rsvp === status;
    setEvents((prev) => prev.map((e) => {
      if (e.id !== event.id) return e;
      const next = { ...e, my_rsvp: wasSame ? null : status };
      if (status === 'going') next.going_count = e.going_count + (wasSame ? -1 : e.my_rsvp ? 0 : 1);
      return next;
    }));
    try {
      wasSame ? await EventsAPI.cancelRsvp(event.id) : await EventsAPI.rsvp(event.id, status);
    } catch {
      load();
    }
  }

  return (
    <div className="screen">
      <BackHeader fallback="/feed" eyebrow="Campus life" title={groupId ? 'Group events' : 'Events'} />

      <button
        type="button"
        onClick={() => navigate('/events/create', groupId ? { state: { groupId } } : undefined)}
        className="btn btn-primary"
        style={{ fontSize: 'var(--fs-sm)', padding: '6px 14px', marginBottom: 'var(--sp-3)' }}
      >
        + Create event
      </button>

      {error && <div className="banner-error">{error}</div>}
      {loading && <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>}

      {!loading && !error && events.length === 0 && (
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-soft)' }}>No upcoming events yet.</p>
        </div>
      )}

      {!loading && events.map((event) => (
        <EventRow key={event.id} event={event} onRsvpToggle={handleRsvpToggle} />
      ))}
    </div>
  );
}
