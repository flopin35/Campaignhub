import { useState } from 'react';
import { CalendarDays, Plus, MapPin, Pencil, Trash2, MessageCircle, Minus, Users, Eye, EyeOff } from 'lucide-react';
import { useWorkspace, useWorkspaceData } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { Card, Button, Input, Select, Textarea, Modal, Badge, EmptyState, Segmented, Toggle } from '../../components/ui';
import ProGate from '../../components/billing/ProGate';
import { EVENT_TYPES, saveEvent, deleteEvent, bumpEventCheckIn } from '../../services/workspaceService';
import { GHANA_REGIONS } from '../../data/ghanaRegions';
import { formatNumber } from '../../utils/format';

export default function Events() {
  return (
    <ProGate
      title="Fill every rally and town hall"
      description="Schedule events, publish them on your campaign page for RSVPs, invite supporters on WhatsApp and count attendance at the gate."
      bullets={['Public event listing with RSVP button', 'One-tap WhatsApp invitations', 'Live check-in counter at the venue', 'Compare expected vs actual turnout']}
    >
      <EventsManager />
    </ProGate>
  );
}

function toLocalInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EventsManager() {
  const { campaign } = useWorkspace();
  const { rows: events } = useWorkspaceData('events');
  const { toast } = useToast();
  const [view, setView] = useState('upcoming');
  const [editing, setEditing] = useState(null);

  const now = Date.now() - 6 * 3600000;
  const upcoming = events.filter((e) => new Date(e.eventDate).getTime() >= now).sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
  const past = events.filter((e) => new Date(e.eventDate).getTime() < now).sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));
  const list = view === 'upcoming' ? upcoming : past;

  const invite = (e) => {
    const when = new Date(e.eventDate).toLocaleString('en-GH', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
    const text = `You're invited: ${e.title} with ${campaign.candidateName || campaign.title}\n${when}\n${e.venue || ''}\nRSVP: ${window.location.origin}/campaign/${campaign.slug}#events`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  const checkIn = async (e, delta) => {
    try {
      await bumpEventCheckIn(e.id, delta);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'upcoming', label: 'Upcoming', badge: upcoming.length },
            { value: 'past', label: 'Past', badge: past.length },
          ]}
        />
        <Button icon={Plus} onClick={() => setEditing({})}>New event</Button>
      </div>

      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarDays}
            title={view === 'upcoming' ? 'No upcoming events' : 'No past events'}
            text="Rallies, town halls, door-to-door days and fundraisers — public events show on your campaign page with an RSVP button."
            action={view === 'upcoming' && <Button icon={Plus} onClick={() => setEditing({})}>Schedule an event</Button>}
          />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {list.map((e) => {
            const d = new Date(e.eventDate);
            return (
              <Card key={e.id} className="flex flex-col">
                <div className="flex gap-4">
                  <div className="w-14 shrink-0 rounded-xl border border-line text-center py-2 h-fit">
                    <p className="text-[11px] uppercase text-ink-3">{d.toLocaleDateString('en-GH', { month: 'short' })}</p>
                    <p className="text-xl font-bold text-ink leading-tight">{d.getDate()}</p>
                    <p className="text-[11px] text-ink-3">{d.toLocaleDateString('en-GH', { weekday: 'short' })}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge tone="neutral">{e.type || 'Event'}</Badge>
                      {e.isPublic === false ? <Badge tone="neutral" icon={EyeOff}>Private</Badge> : <Badge tone="success" icon={Eye}>On public page</Badge>}
                    </div>
                    <h3 className="text-base font-semibold text-ink mt-2">{e.title}</h3>
                    <p className="text-sm text-ink-3 mt-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> {e.venue || 'Venue TBC'}
                      {' · '}
                      {d.toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-5 text-center">
                  <div className="rounded-lg bg-surface-2 py-2">
                    <p className="text-lg font-bold text-ink num">{formatNumber(e.rsvpCount || 0)}</p>
                    <p className="text-[11px] text-ink-3">RSVPs</p>
                  </div>
                  <div className="rounded-lg bg-surface-2 py-2">
                    <p className="text-lg font-bold text-ink num">{formatNumber(e.expected || 0)}</p>
                    <p className="text-[11px] text-ink-3">Expected</p>
                  </div>
                  <div className="rounded-lg bg-surface-2 py-2">
                    <p className="text-lg font-bold text-ink num">{formatNumber(e.checkInCount || 0)}</p>
                    <p className="text-[11px] text-ink-3">Checked in</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-line">
                  <div className="inline-flex items-center rounded-xl border border-line-strong">
                    <button type="button" className="btn btn-ghost btn-sm h-9 w-9 p-0" onClick={() => checkIn(e, -1)} aria-label="Remove check-in">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-2 text-xs text-ink-2 inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Check-in</span>
                    <button type="button" className="btn btn-ghost btn-sm h-9 w-9 p-0" onClick={() => checkIn(e, 1)} aria-label="Add check-in">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <Button size="sm" variant="secondary" icon={MessageCircle} onClick={() => invite(e)}>Invite</Button>
                  <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(e)} className="ml-auto">Edit</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <EventDialog event={editing} onClose={() => setEditing(null)} campaign={campaign} />
    </div>
  );
}

function EventDialog({ event, onClose, campaign }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [lastId, setLastId] = useState(null);
  const key = event ? event.id || 'new' : null;
  if (key !== lastId) {
    setLastId(key);
    setIsPublic(event?.isPublic !== false);
  }
  if (!event) return null;
  const isNew = !event.id;

  const submit = async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
    setSaving(true);
    try {
      await saveEvent(campaign.id, { ...fd, eventDate: fd.eventDate ? new Date(fd.eventDate).toISOString() : '', isPublic }, event.id);
      toast(isNew ? 'Event scheduled' : 'Event updated', 'success');
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this event?')) return;
    await deleteEvent(event.id).catch((err) => toast(err.message, 'error'));
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={isNew ? 'New event' : 'Edit event'}
      footer={
        <>
          {!isNew && <Button variant="danger-ghost" icon={Trash2} onClick={remove} className="mr-auto">Delete</Button>}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="event-form" loading={saving}>{isNew ? 'Schedule' : 'Save'}</Button>
        </>
      }
    >
      <form id="event-form" onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
        <Input className="sm:col-span-2" name="title" label="Title" required defaultValue={event.title} placeholder="e.g. Madina Unity Rally" />
        <Select name="type" label="Type" defaultValue={event.type || 'Rally'} options={EVENT_TYPES} />
        <Input name="eventDate" label="Date & time" type="datetime-local" required defaultValue={toLocalInput(event.eventDate)} />
        <Input className="sm:col-span-2" name="venue" label="Venue" defaultValue={event.venue} placeholder="e.g. Zongo Junction park" />
        <Select name="region" label="Region" defaultValue={event.region || campaign.region || ''} options={GHANA_REGIONS} placeholder="Select" />
        <Input name="constituency" label="Constituency" defaultValue={event.constituency || campaign.constituency} />
        <Input name="expected" label="Expected attendance" type="number" min="0" defaultValue={event.expected} optional />
        <div className="sm:col-span-2">
          <Textarea name="description" label="Details" rows={3} defaultValue={event.description} optional />
        </div>
        <div className="sm:col-span-2 rounded-xl border border-line p-4">
          <Toggle checked={isPublic} onChange={setIsPublic} label="Show on public campaign page" description="Supporters can see it and RSVP." />
        </div>
      </form>
    </Modal>
  );
}
