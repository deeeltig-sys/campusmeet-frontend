import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { EventsAPI } from '../api/client';
import BackHeader from '../components/BackHeader';
import PeopleListModal from '../components/PeopleListModal';

function formatWhen(iso) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default function EventDetail() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rsvpBusy, setRsvpBusy] = useState(false);
  const [attendeeModal, setAttendeeModal] = useState(null); // null | 'going' | 'interested'

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setEvent(await EventsAPI.get(eventId));
    } catch (err) {
      setError(err.message || "This event won't load right now.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  async function handleRsvp(status) {
    if (!event || rsvpBusy) return;
    setRsvpBusy(true);
    const wasSame = event.my_rsvp === status;
    const prev = event;
    setEvent((e) => {
      const next = { ...e, my_rsvp: wasSame ? null : status };
      if (status === 'going') next.going_count = e.going_count + (wasSame ? -1 : e.my_rsvp === 'going' ? 0 : 1);
      if (status === 'interested') next.interested_count = e.interested_count + (wasSame ? -1 : e.my_rsvp === 'interested' ? 0 : 1);
      if (!wasSame && e.my_rsvp && e.my_rsvp !== status) {
        if (e.my_rsvp === 'going') next.going_count -= 1;
        if (e.my_rsvp === 'interested') next.interested_count -= 1;
      }
      return next;
    });
    try {
      wasSame ? await EventsAPI.cancelRsvp(eventId) : await EventsAPI.rsvp(eventId, status);
    } catch {
      setEvent(prev);
    } finally {
      setRsvpBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="screen">
        <BackHeader fallback="/events" title="Loading…" />
        <p style={{ color: 'var(--ink-soft)' }}>Loading…</p>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="screen">
        <BackHeader fallback="/events" title="Event" />
        <div className="banner-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="screen">
      <BackHeader fallback="/events" eyebrow="Event" title={event.title} />

      {error && <div className="banner-error">{error}</div>}

      <div className="card" style={{ marginBottom: 'var(--sp-3)' }}>
        <p style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, margin: '0 0 4px' }}>{formatWhen(event.start_at)}</p>
        {event.location && (
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)', margin: '0 0 var(--sp-2)' }}>📍 {event.location}</p>
        )}
        {event.description && (
          <p style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.55 }}>{event.description}</p>
        )}

        <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-3)' }}>
          <button
            type="button"
            onClick={() => handleRsvp('going')}
            disabled={rsvpBusy}
            className={event.my_rsvp === 'going' ? 'btn btn-primary' : 'btn'}
            style={{ fontSize: 'var(--fs-sm)', padding: '8px 16px', flex: 1 }}
          >
            {event.my_rsvp === 'going' ? '✓ Going' : 'Going'}
          </button>
          <button
            type="button"
            onClick={() => handleRsvp('interested')}
            disabled={rsvpBusy}
            className={event.my_rsvp === 'interested' ? 'btn btn-primary' : 'btn'}
            style={{ fontSize: 'var(--fs-sm)', padding: '8px 16px', flex: 1 }}
          >
            {event.my_rsvp === 'interested' ? '✓ Interested' : 'Interested'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-3)' }}>
          <button
            type="button"
            onClick={() => setAttendeeModal('going')}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 'var(--fs-sm)', color: 'inherit' }}
          >
            <strong>{event.going_count}</strong> going
          </button>
          <button
            type="button"
            onClick={() => setAttendeeModal('interested')}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 'var(--fs-sm)', color: 'inherit' }}
          >
            <strong>{event.interested_count}</strong> interested
          </button>
        </div>
      </div>

      {attendeeModal && (
        <PeopleListModal
          title={attendeeModal === 'going' ? 'Going' : 'Interested'}
          fetcher={() => EventsAPI.attendees(eventId, attendeeModal)}
          emptyText={attendeeModal === 'going' ? 'No one has RSVP\u2019d going yet.' : 'No one has marked interested yet.'}
          onClose={() => setAttendeeModal(null)}
        />
      )}
    </div>
  );
}
