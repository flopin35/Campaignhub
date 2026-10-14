import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  UserPlus,
  Upload,
  Download,
  Phone,
  MessageCircle,
  Users,
  Trash2,
  FileSpreadsheet,
  DoorOpen,
} from 'lucide-react';
import { useWorkspace, useWorkspaceData } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { Card, Button, Input, Select, Textarea, Modal, Badge, EmptyState, Segmented } from '../../components/ui';
import ProGate from '../../components/billing/ProGate';
import { SupportBar } from '../../components/charts';
import { SUPPORT_LEVELS, UNKNOWN_LEVEL, getSupportLevel, countBySupport } from '../../utils/projection';
import { addVoter, updateVoter, deleteVoter, logVoterContact, importVoters } from '../../services/workspaceService';
import { GHANA_REGIONS } from '../../data/ghanaRegions';
import { downloadCsv, parseCsv, pick } from '../../utils/csv';
import { formatNumber, timeAgo, toWhatsAppNumber, cn } from '../../utils/format';

const LEVEL_BADGE = { strong: 'info', leaning: 'info', undecided: 'neutral', opposed: 'danger', unknown: 'neutral' };
/* Written out in full so Tailwind 3 keeps these classes in the production CSS. */
const LEVEL_SELECT_CLASS = { strong: 'badge-info', leaning: 'badge-info', undecided: 'badge-neutral', opposed: 'badge-danger', unknown: 'badge-neutral' };
const LEVEL_DOT = {
  strong: 'rgb(var(--viz-strong))',
  leaning: 'rgb(var(--viz-lean))',
  undecided: 'rgb(var(--viz-neutral))',
  opposed: 'rgb(var(--viz-against))',
  unknown: 'transparent',
};

const EXPORT_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'region', label: 'Region' },
  { key: 'constituency', label: 'Constituency' },
  { key: 'electoralArea', label: 'Electoral area' },
  { key: 'pollingStation', label: 'Polling station' },
  { label: 'Support level', get: (r) => getSupportLevel(r.supportLevel).label },
  { label: 'Tags', get: (r) => (r.tags || []).join('; ') },
  { key: 'source', label: 'Source' },
  { key: 'collectedBy', label: 'Collected by' },
  { key: 'notes', label: 'Notes' },
];

const PAGE = 50;

export function exportVoters(campaign, rows) {
  downloadCsv(`${campaign.slug || 'voters'}-voters-${new Date().toISOString().slice(0, 10)}`, rows, EXPORT_COLUMNS);
}

export default function Voters() {
  const { campaign } = useWorkspace();
  const { rows: voters, loading } = useWorkspaceData('voters');
  return (
    <ProGate
      title="Know every voter who can put you over the line"
      description="Your CRM keeps every supporter, door-to-door contact and sign-up in one place — by polling station, with support levels that feed your path-to-victory projection."
      bullets={[
        'Import your existing lists from Excel / CSV in seconds',
        'Mark each voter strong, leaning, undecided or opposed',
        'Filter by region, constituency, polling station and tags',
        'One tap to call or WhatsApp — and export anytime',
      ]}
      onExport={() => exportVoters(campaign, voters)}
    >
      <VoterCrm voters={voters} loading={loading} />
    </ProGate>
  );
}

function VoterCrm({ voters, loading }) {
  const { campaign } = useWorkspace();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [level, setLevel] = useState('all');
  const [region, setRegion] = useState('');
  const [station, setStation] = useState('');
  const [tag, setTag] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [editing, setEditing] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    if (params.get('add')) setEditing({});
    if (params.get('import')) setImportOpen(true);
    if (params.get('add') || params.get('import')) {
      params.delete('add');
      params.delete('import');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const counts = useMemo(() => countBySupport(voters), [voters]);
  const stations = useMemo(() => [...new Set(voters.map((v) => v.pollingStation).filter(Boolean))].sort(), [voters]);
  const tags = useMemo(() => [...new Set(voters.flatMap((v) => v.tags || []))].sort(), [voters]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return voters.filter((v) => {
      if (level !== 'all' && (v.supportLevel || 'unknown') !== level) return false;
      if (region && v.region !== region) return false;
      if (station && v.pollingStation !== station) return false;
      if (tag && !(v.tags || []).includes(tag)) return false;
      if (term) {
        const hay = `${v.name} ${v.phone} ${v.pollingStation} ${v.constituency} ${(v.tags || []).join(' ')}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [voters, q, level, region, station, tag]);

  useEffect(() => setLimit(PAGE), [q, level, region, station, tag]);

  const changeLevel = async (v, next) => {
    try {
      await updateVoter(v.id, { supportLevel: next });
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-ink-3 mb-2.5">
              <span className="font-semibold text-ink">{formatNumber(voters.length)}</span> voters ·{' '}
              {formatNumber(voters.length - counts.unknown)} assessed
            </p>
            <SupportBar counts={counts} />
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button icon={UserPlus} onClick={() => setEditing({})}>Add voter</Button>
            <Button variant="secondary" icon={Upload} onClick={() => setImportOpen(true)}>Import</Button>
            <Button variant="secondary" icon={Download} onClick={() => exportVoters(campaign, filtered)} disabled={!filtered.length}>
              Export
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-3">
        <div className="scroll-x">
          <Segmented
            value={level}
            onChange={setLevel}
            options={[
              { value: 'all', label: 'All', badge: voters.length },
              ...SUPPORT_LEVELS.map((l) => ({ value: l.id, label: l.short, badge: counts[l.id] })),
              { value: 'unknown', label: 'Unassessed', badge: counts.unknown },
            ]}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-ink-3 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input className="input pl-10" placeholder="Search name, phone, station…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="input" value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Region">
            <option value="">All regions</option>
            {GHANA_REGIONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <select className="input" value={station} onChange={(e) => setStation(e.target.value)} aria-label="Polling station">
            <option value="">All polling stations</option>
            {stations.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className="input" value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Tag">
            <option value="">All tags</option>
            {tags.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <Card><p className="text-sm text-ink-3">Loading voters…</p></Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title={voters.length ? 'No voters match these filters' : 'Your voter CRM is empty'}
            text={voters.length ? 'Try clearing a filter.' : 'Add voters one by one, import a list from Excel, or send canvassing links to your field team.'}
            action={!voters.length && (
              <>
                <Button icon={UserPlus} onClick={() => setEditing({})}>Add voter</Button>
                <Button variant="secondary" icon={Upload} onClick={() => setImportOpen(true)}>Import CSV</Button>
              </>
            )}
          />
        </Card>
      ) : (
        <>
          <div className="hidden md:block card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Polling station</th>
                    <th>Support</th>
                    <th>Tags</th>
                    <th>Last contact</th>
                    <th className="w-24" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, limit).map((v) => (
                    <tr key={v.id} className="cursor-pointer" onClick={() => setEditing(v)}>
                      <td>
                        <span className="font-medium text-ink">{v.name}</span>
                        <span className="block text-xs text-ink-3">{[v.constituency, v.region].filter(Boolean).join(', ')}</span>
                      </td>
                      <td className="num whitespace-nowrap">{v.phone}</td>
                      <td className="max-w-[180px] truncate">{v.pollingStation || <span className="text-ink-3">—</span>}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <LevelSelect value={v.supportLevel} onChange={(next) => changeLevel(v, next)} />
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {(v.tags || []).slice(0, 3).map((t) => <Badge key={t} className="h-5 text-[11px]">{t}</Badge>)}
                        </div>
                      </td>
                      <td className="text-xs text-ink-3 whitespace-nowrap">{v.lastContactAt ? timeAgo(v.lastContactAt) : 'Never'}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <ContactButtons voter={v} campaign={campaign} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:hidden space-y-2.5">
            {filtered.slice(0, limit).map((v) => (
              <div key={v.id} className="card p-4" onClick={() => setEditing(v)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full border border-line-strong shrink-0" style={{ background: LEVEL_DOT[v.supportLevel || 'unknown'] }} />
                      {v.name}
                    </p>
                    <p className="text-xs text-ink-3 mt-0.5 truncate">{v.phone} · {v.pollingStation || v.constituency || v.region || 'No location'}</p>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <ContactButtons voter={v} campaign={campaign} />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <LevelSelect value={v.supportLevel} onChange={(next) => changeLevel(v, next)} />
                  {(v.tags || []).slice(0, 2).map((t) => <Badge key={t} className="h-5 text-[11px]">{t}</Badge>)}
                </div>
              </div>
            ))}
          </div>

          {filtered.length > limit && (
            <div className="text-center">
              <Button variant="secondary" onClick={() => setLimit((l) => l + PAGE)}>
                Show more ({formatNumber(filtered.length - limit)} remaining)
              </Button>
            </div>
          )}
        </>
      )}

      <VoterDialog voter={editing} onClose={() => setEditing(null)} campaign={campaign} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} campaign={campaign} existing={voters} />
    </div>
  );
}

function LevelSelect({ value, onChange }) {
  const current = value || 'unknown';
  return (
    <div className="relative inline-flex items-center">
      <span className="absolute left-2.5 w-2 h-2 rounded-full pointer-events-none border border-line-strong" style={{ background: LEVEL_DOT[current] }} />
      <select
        className={cn('input input-sm h-8 pl-6 pr-8 text-xs w-[128px] font-medium', LEVEL_SELECT_CLASS[current] || 'badge-neutral')}
        value={current}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Support level"
      >
        {SUPPORT_LEVELS.map((l) => <option key={l.id} value={l.id}>{l.short}</option>)}
        <option value="unknown">{UNKNOWN_LEVEL.short}</option>
      </select>
    </div>
  );
}

function ContactButtons({ voter, campaign }) {
  const name = (voter.name || '').split(' ')[0];
  const text = `Hello ${name}, thank you for supporting ${campaign.candidateName || campaign.title}.`;
  return (
    <div className="flex gap-1">
      <a href={`tel:${voter.phone}`} className="btn btn-ghost btn-icon h-8 w-8" aria-label={`Call ${voter.name}`}>
        <Phone className="w-4 h-4" />
      </a>
      <a
        href={`https://wa.me/${toWhatsAppNumber(voter.phone)}?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-ghost btn-icon h-8 w-8"
        aria-label={`WhatsApp ${voter.name}`}
      >
        <MessageCircle className="w-4 h-4" />
      </a>
    </div>
  );
}

const EMPTY_VOTER = {
  name: '', phone: '', email: '', region: '', constituency: '', electoralArea: '', pollingStation: '',
  gender: '', ageGroup: '', supportLevel: 'unknown', tags: '', notes: '',
};

function VoterDialog({ voter, onClose, campaign }) {
  const { toast } = useToast();
  const isNew = voter && !voter.id;
  const [form, setForm] = useState(EMPTY_VOTER);
  const [saving, setSaving] = useState(false);
  const [contact, setContact] = useState({ method: 'door', note: '' });
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    if (!voter) return;
    setForm({
      ...EMPTY_VOTER,
      region: campaign.region || '',
      constituency: campaign.constituency || '',
      ...voter,
      tags: (voter.tags || []).join(', '),
      supportLevel: voter.supportLevel || 'unknown',
    });
    setContact({ method: 'door', note: '' });
  }, [voter, campaign.region, campaign.constituency]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isNew) {
        await addVoter(campaign.id, form);
        toast(`${form.name} added`, 'success');
      } else {
        await updateVoter(voter.id, form);
        toast('Voter updated', 'success');
      }
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const logContact = async () => {
    if (logging) return;
    setLogging(true);
    try {
      await logVoterContact(voter, { method: contact.method, note: contact.note, supportLevel: form.supportLevel });
      toast('Contact logged', 'success');
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLogging(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Remove ${voter.name} from your CRM?`)) return;
    try {
      await deleteVoter(voter.id);
      toast('Voter removed', 'info');
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <Modal
      open={!!voter}
      onClose={onClose}
      size="lg"
      title={isNew ? 'Add voter' : voter?.name}
      subtitle={!isNew && voter ? `Added ${timeAgo(voter.createdAt)} · ${voter.contactCount || 0} contacts logged` : undefined}
      footer={
        <>
          {!isNew && (
            <Button variant="danger-ghost" icon={Trash2} onClick={remove} className="mr-auto">Remove</Button>
          )}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="voter-form" loading={saving}>{isNew ? 'Add voter' : 'Save changes'}</Button>
        </>
      }
    >
      <form id="voter-form" onSubmit={save} className="grid sm:grid-cols-2 gap-4">
        <Input label="Full name" required value={form.name} onChange={set('name')} autoComplete="off" />
        <Input label="Phone" required value={form.phone} onChange={set('phone')} inputMode="tel" placeholder="024 123 4567" />
        <Select label="Support level" value={form.supportLevel} onChange={set('supportLevel')} options={[...SUPPORT_LEVELS.map((l) => ({ value: l.id, label: l.label })), { value: 'unknown', label: UNKNOWN_LEVEL.label }]} />
        <Input label="Polling station" value={form.pollingStation} onChange={set('pollingStation')} placeholder="e.g. Methodist JHS A" />
        <Select label="Region" value={form.region} onChange={set('region')} options={GHANA_REGIONS} placeholder="Select region" />
        <Input label="Constituency" value={form.constituency} onChange={set('constituency')} />
        <Input label="Electoral area" value={form.electoralArea} onChange={set('electoralArea')} optional />
        <Input label="Email" type="email" value={form.email} onChange={set('email')} optional />
        <Select label="Gender" value={form.gender} onChange={set('gender')} options={['Female', 'Male']} placeholder="—" optional />
        <Select label="Age group" value={form.ageGroup} onChange={set('ageGroup')} options={['18–24', '25–34', '35–44', '45–59', '60+']} placeholder="—" optional />
        <Input className="sm:col-span-2" label="Tags" value={form.tags} onChange={set('tags')} placeholder="youth, market women, church group" hint="Separate with commas" />
        <Textarea className="sm:col-span-2" label="Notes" rows={3} value={form.notes} onChange={set('notes')} />
      </form>

      {!isNew && voter && (
        <div className="mt-6 rounded-xl border border-line bg-surface-2 p-4">
          <p className="text-sm font-semibold text-ink flex items-center gap-2"><DoorOpen className="w-4 h-4" /> Log a contact</p>
          <div className="grid sm:grid-cols-[160px_1fr_auto] gap-2 mt-3">
            <select className="input" value={contact.method} onChange={(e) => setContact((c) => ({ ...c, method: e.target.value }))} aria-label="Contact method">
              <option value="door">Door-to-door</option>
              <option value="call">Phone call</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="event">At an event</option>
            </select>
            <input className="input" placeholder="What did they say? (optional)" value={contact.note} onChange={(e) => setContact((c) => ({ ...c, note: e.target.value }))} />
            <Button variant="secondary" onClick={logContact} loading={logging}>Log contact</Button>
          </div>
          <p className="hint">The support level selected above is saved with the contact.</p>
        </div>
      )}
    </Modal>
  );
}

const SAMPLE_CSV = 'name,phone,polling station,region,constituency,support,tags\nAma Mensah,0241234567,Methodist JHS A,Greater Accra,Madina,strong,market women\nKofi Boateng,0209876543,Zongo Park,Greater Accra,Madina,undecided,youth';

function normaliseLevel(raw = '') {
  const v = String(raw).toLowerCase().trim();
  if (!v) return 'unknown';
  // Most specific first: "not sure" must not match "sure", "maybe yes" must not count as strong.
  if (/oppos|against|other party|^no$|^no\b|won'?t vote for|will not vote/.test(v)) return 'opposed';
  if (/undecided|unsure|not sure|don'?t know|swing|^maybe$|neutral/.test(v)) return 'undecided';
  if (/lean|likely|maybe yes|probably|soft/.test(v)) return 'leaning';
  if (/strong|^yes$|^yes\b|definite|sure|core|solid/.test(v)) return 'strong';
  return 'unknown';
}

function ImportDialog({ open, onClose, campaign, existing }) {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [progress, setProgress] = useState(null);
  const fileRef = useRef(null);

  const parsed = useMemo(() => {
    if (!text.trim()) return { rows: [], headers: [] };
    const { headers, records } = parseCsv(text);
    const rows = records.map((r) => ({
      name: pick(r, 'name', 'full name', 'fullname', 'voter name', 'names'),
      phone: pick(r, 'phone', 'phone number', 'mobile', 'contact', 'telephone', 'tel'),
      email: pick(r, 'email', 'e-mail'),
      region: pick(r, 'region') || campaign.region || '',
      constituency: pick(r, 'constituency') || campaign.constituency || '',
      electoralArea: pick(r, 'electoral area', 'ward', 'area'),
      pollingStation: pick(r, 'polling station', 'pollingstation', 'station', 'ps', 'polling station name'),
      supportLevel: normaliseLevel(pick(r, 'support', 'support level', 'status', 'leaning')),
      tags: pick(r, 'tags', 'group', 'groups'),
      notes: pick(r, 'notes', 'note', 'comments'),
      gender: pick(r, 'gender', 'sex'),
    }));
    return { rows, headers };
  }, [text, campaign.region, campaign.constituency]);

  const valid = parsed.rows.filter((r) => r.name && r.phone);

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (/\.xlsx?$/i.test(file.name)) {
      toast('Excel file detected — in Excel choose File → Save As → CSV, then upload the CSV.', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result || ''));
    reader.readAsText(file);
    e.target.value = '';
  };

  const run = async () => {
    setProgress({ done: 0, total: valid.length });
    try {
      const res = await importVoters(campaign.id, valid, existing, (done, total) => setProgress({ done, total }));
      toast(`Imported ${formatNumber(res.imported)} voters${res.skipped ? ` · ${formatNumber(res.skipped)} skipped (duplicates or missing phone)` : ''}`, 'success');
      setText('');
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setProgress(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={progress ? undefined : onClose}
      dismissible={!progress}
      size="lg"
      title="Import voters"
      subtitle="Upload a CSV from Excel or Google Sheets, or paste rows below."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={!!progress}>Cancel</Button>
          <Button onClick={run} disabled={!valid.length} loading={!!progress}>
            {progress ? `Importing ${progress.done}/${progress.total}…` : `Import ${formatNumber(valid.length)} voters`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={FileSpreadsheet} onClick={() => fileRef.current?.click()}>Choose CSV file</Button>
          <Button variant="ghost" onClick={() => setText(SAMPLE_CSV)}>Use sample format</Button>
          <input ref={fileRef} type="file" accept=".csv,text/csv,.txt,.xlsx,.xls" className="hidden" onChange={onFile} />
        </div>
        <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={SAMPLE_CSV} className="font-mono" />
        <p className="text-xs text-ink-3">
          Recognised columns: name, phone, polling station, region, constituency, electoral area, support (strong / leaning / undecided / opposed), tags, email, notes.
          Duplicate phone numbers are skipped automatically.
        </p>
        {parsed.rows.length > 0 && (
          <div className="rounded-xl border border-line p-3 text-sm">
            <p className="text-ink">
              <strong>{formatNumber(valid.length)}</strong> ready to import
              {parsed.rows.length - valid.length > 0 && (
                <span className="text-warning"> · {parsed.rows.length - valid.length} rows missing a name or phone</span>
              )}
            </p>
            <p className="text-xs text-ink-3 mt-1">Columns found: {parsed.headers.join(', ')}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
