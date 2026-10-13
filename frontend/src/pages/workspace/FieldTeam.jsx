import { useEffect, useMemo, useState } from 'react';
import {
  Footprints,
  Link2,
  Copy,
  MessageCircle,
  Trash2,
  Power,
  UserCheck,
  Trophy,
  Plus,
  Smartphone,
} from 'lucide-react';
import { useWorkspace, useWorkspaceData } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, Button, Input, Modal, Badge, EmptyState, Tabs, useCopy } from '../../components/ui';
import { BarList } from '../../components/charts';
import ProGate from '../../components/billing/ProGate';
import { createFieldLink, setFieldLinkActive, deleteFieldLink } from '../../services/workspaceService';
import { updateVolunteerStatus } from '../../services/volunteerService';
import { formatNumber, timeAgo, toWhatsAppNumber, cn } from '../../utils/format';

export function fieldLinkUrl(token) {
  return `${window.location.origin}/field/${token}`;
}

export function agentWhatsApp(link, campaign) {
  const url = fieldLinkUrl(link.id);
  const role = link.mode === 'results' ? `polling agent for ${link.stationName || 'your polling station'}` : 'canvasser';
  const text = `Hello ${link.agentName || ''}, you are a ${role} for ${campaign.candidateName || campaign.title}. Use this private link on election day / in the field (don't share it):\n${url}`;
  return link.agentPhone
    ? `https://wa.me/${toWhatsAppNumber(link.agentPhone)}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export default function FieldTeam() {
  return (
    <ProGate
      title="Turn volunteers into a field machine"
      description="Give every canvasser a private link. They log door-to-door conversations from any phone — no app, no password — and every entry lands in your voter CRM instantly."
      bullets={[
        'Private canvassing links per volunteer (revoke anytime)',
        'Support level captured at the door feeds your projection',
        'Leaderboard of contacts per canvasser',
        'Approve volunteers who sign up on your public page',
      ]}
    >
      <FieldWorkspace />
    </ProGate>
  );
}

function FieldWorkspace() {
  const { campaign } = useWorkspace();
  const { rows: links } = useWorkspaceData('fieldLinks');
  const { rows: voters } = useWorkspaceData('voters');
  const { rows: volunteers } = useWorkspaceData('volunteers');
  const [tab, setTab] = useState('canvassers');
  const [creating, setCreating] = useState(null);

  const canvassLinks = links.filter((l) => l.mode === 'canvass');
  const perToken = useMemo(() => {
    const m = {};
    voters.forEach((v) => {
      if (v.fieldToken) m[v.fieldToken] = (m[v.fieldToken] || 0) + 1;
    });
    return m;
  }, [voters]);
  const fieldTotal = voters.filter((v) => v.source === 'field').length;
  const leaderboard = canvassLinks
    .map((l) => ({ label: l.agentName || 'Unnamed', value: perToken[l.id] || 0, key: l.id }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat label="Active canvassers" value={canvassLinks.filter((l) => l.active !== false).length} />
        <MiniStat label="Contacts from the field" value={fieldTotal} />
        <MiniStat label="Volunteer sign-ups" value={volunteers.length} />
        <MiniStat label="Awaiting approval" value={volunteers.filter((v) => v.status === 'pending').length} />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'canvassers', label: 'Canvassing links', icon: Link2, count: canvassLinks.length },
          { value: 'volunteers', label: 'Volunteers', icon: UserCheck, count: volunteers.length },
        ]}
      />

      {tab === 'canvassers' ? (
        <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6">
          <Card pad={false}>
            <div className="p-5 sm:p-6 pb-0">
              <CardHeader
                title="Canvassing links"
                subtitle="Each link opens a simple mobile form that adds voters to your CRM."
                action={<Button size="sm" icon={Plus} onClick={() => setCreating({})}>New link</Button>}
              />
            </div>
            {canvassLinks.length === 0 ? (
              <EmptyState
                icon={Footprints}
                title="No canvassers yet"
                text="Create a link for each volunteer and send it on WhatsApp. They can start logging doors in under a minute."
                action={<Button icon={Plus} onClick={() => setCreating({})}>Create first link</Button>}
              />
            ) : (
              <ul className="divide-y divide-line">
                {canvassLinks.map((l) => (
                  <LinkRow key={l.id} link={l} count={perToken[l.id] || 0} campaign={campaign} />
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader title="Leaderboard" subtitle="Voters logged per canvasser" icon={Trophy} />
            <BarList items={leaderboard} emptyText="Entries will appear as your team logs contacts." />
            <div className="mt-6 rounded-xl bg-surface-2 p-4 text-sm text-ink-2">
              <p className="font-semibold text-ink flex items-center gap-2"><Smartphone className="w-4 h-4" /> How it works</p>
              <ol className="mt-2 space-y-1.5 list-decimal list-inside">
                <li>Create a link and send it on WhatsApp.</li>
                <li>Your canvasser opens it on their phone at each door.</li>
                <li>They record name, phone, polling station and support level.</li>
                <li>Entries appear in Voters instantly — tagged with their name.</li>
              </ol>
            </div>
          </Card>
        </div>
      ) : (
        <VolunteerList volunteers={volunteers} onMakeAgent={(v) => setCreating({ agentName: v.name, agentPhone: v.phone })} />
      )}

      <CreateLinkDialog
        open={!!creating}
        initial={creating}
        mode="canvass"
        onClose={() => setCreating(null)}
        campaign={campaign}
      />
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="card p-4">
      <p className="text-[13px] text-ink-3">{label}</p>
      <p className="text-2xl font-bold font-display text-ink mt-1">{formatNumber(value)}</p>
    </div>
  );
}

function LinkRow({ link, count, campaign }) {
  const { toast } = useToast();
  const { copy, copied } = useCopy();
  const active = link.active !== false;

  const toggle = async () => {
    try {
      await setFieldLinkActive(link.id, !active);
      toast(active ? 'Link paused — it no longer accepts entries' : 'Link re-activated', 'info');
    } catch (err) {
      toast(err.message, 'error');
    }
  };
  const remove = async () => {
    if (!window.confirm('Delete this link? Entries already collected stay in your CRM.')) return;
    try {
      await deleteFieldLink(link.id);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <li className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-ink flex items-center gap-2">
          {link.agentName || 'Unnamed canvasser'}
          {!active && <Badge tone="neutral">Paused</Badge>}
        </p>
        <p className="text-xs text-ink-3 mt-0.5">
          {formatNumber(count)} voters logged · created {timeAgo(link.createdAt)}
          {link.agentPhone && ` · ${link.agentPhone}`}
        </p>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        <Button size="sm" variant="secondary" icon={Copy} onClick={() => copy(fieldLinkUrl(link.id), link.id)}>
          {copied === link.id ? 'Copied' : 'Copy link'}
        </Button>
        <Button size="sm" variant="secondary" icon={MessageCircle} href={agentWhatsApp(link, campaign)} target="_blank" rel="noopener noreferrer">
          WhatsApp
        </Button>
        <button type="button" onClick={toggle} className="btn btn-ghost btn-sm h-9 w-9 p-0" title={active ? 'Pause link' : 'Activate link'} aria-label={active ? 'Pause link' : 'Activate link'}>
          <Power className={cn('w-4 h-4', active ? 'text-success' : 'text-ink-3')} />
        </button>
        <button type="button" onClick={remove} className="btn btn-danger-ghost btn-sm h-9 w-9 p-0" aria-label="Delete link">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </li>
  );
}

export function CreateLinkDialog({ open, onClose, campaign, mode = 'canvass', initial, station }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ agentName: '', agentPhone: '' });
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);
  const { copy, copied } = useCopy();

  const reset = () => {
    setForm({ agentName: '', agentPhone: '' });
    setCreated(null);
  };

  useEffect(() => {
    if (!open) return;
    setCreated(null);
    setForm({
      agentName: initial?.agentName || station?.agentName || '',
      agentPhone: initial?.agentPhone || station?.agentPhone || '',
    });
  }, [open, initial, station]);

  const name = form.agentName;
  const phone = form.agentPhone;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const link = await createFieldLink(campaign, { mode, agentName: name, agentPhone: phone, station });
      setCreated(link);
      toast('Link created', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={mode === 'results' ? 'Polling agent link' : 'New canvassing link'}
      subtitle={mode === 'results' ? station?.name : 'Send this private link to one volunteer.'}
      footer={
        created ? (
          <Button onClick={close}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button type="submit" form="field-link-form" loading={saving}>Create link</Button>
          </>
        )
      }
    >
      {created ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <p className="text-xs text-ink-3 mb-1">Private link for {created.agentName || 'your agent'}</p>
            <p className="text-sm text-ink break-all num">{fieldLinkUrl(created.id)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button icon={MessageCircle} href={agentWhatsApp(created, campaign)} target="_blank" rel="noopener noreferrer">
              Send on WhatsApp
            </Button>
            <Button variant="secondary" icon={Copy} onClick={() => copy(fieldLinkUrl(created.id), 'new')}>
              {copied === 'new' ? 'Copied' : 'Copy link'}
            </Button>
          </div>
          <p className="text-xs text-ink-3">Anyone with this link can submit entries for your campaign. Pause or delete it anytime.</p>
        </div>
      ) : (
        <form id="field-link-form" onSubmit={save} className="space-y-4">
          <Input
            label={mode === 'results' ? 'Polling agent name' : 'Volunteer name'}
            required
            value={name}
            onChange={(e) => setForm((f) => ({ ...f, agentName: e.target.value }))}
          />
          <Input
            label="Phone (for WhatsApp)"
            inputMode="tel"
            value={phone}
            onChange={(e) => setForm((f) => ({ ...f, agentPhone: e.target.value }))}
            optional
          />
        </form>
      )}
    </Modal>
  );
}

function VolunteerList({ volunteers, onMakeAgent }) {
  const { toast } = useToast();
  const setStatus = async (v, status) => {
    try {
      await updateVolunteerStatus(v.id, status);
      toast(`${v.name} marked ${status}`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };
  if (!volunteers.length) {
    return (
      <Card>
        <EmptyState
          icon={UserCheck}
          title="No volunteer sign-ups yet"
          text="Turn on the volunteer section of your public campaign page — people who sign up appear here for approval."
        />
      </Card>
    );
  }
  return (
    <Card pad={false} className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Volunteer</th>
              <th>Area</th>
              <th>Skills</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {volunteers.map((v) => (
              <tr key={v.id}>
                <td>
                  <span className="font-medium text-ink">{v.name}</span>
                  <span className="block text-xs text-ink-3 num">{v.phone}</span>
                </td>
                <td className="text-sm">{[v.constituency, v.region].filter(Boolean).join(', ') || '—'}</td>
                <td className="text-xs max-w-[200px]">{(v.skills || []).join(', ') || v.availability || '—'}</td>
                <td>
                  <Badge tone={v.status === 'pending' ? 'warning' : v.status === 'inactive' ? 'neutral' : 'success'}>{v.status}</Badge>
                </td>
                <td>
                  <div className="flex gap-1.5 justify-end">
                    {v.status === 'pending' && <Button size="sm" variant="secondary" onClick={() => setStatus(v, 'approved')}>Approve</Button>}
                    <Button size="sm" variant="secondary" onClick={() => onMakeAgent(v)}>Give canvass link</Button>
                    {v.status !== 'inactive' && (
                      <Button size="sm" variant="ghost" onClick={() => setStatus(v, 'inactive')}>Deactivate</Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
