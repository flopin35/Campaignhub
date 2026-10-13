import { useMemo, useState } from 'react';
import {
  Send,
  MessageCircle,
  MessageSquareText,
  Mail,
  Download,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Copy,
  History,
  Users,
} from 'lucide-react';
import { useWorkspace, useWorkspaceData } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, Button, Select, Modal, Badge, EmptyState, Checkbox, useCopy } from '../../components/ui';
import ProGate from '../../components/billing/ProGate';
import { MESSAGE_TEMPLATES, fillTemplate, smsSegments } from '../../data/messageTemplates';
import { SUPPORT_LEVELS, UNKNOWN_LEVEL } from '../../utils/projection';
import { logBroadcast } from '../../services/workspaceService';
import { generateStudioDraft } from '../../services/aiService';
import { GHANA_REGIONS } from '../../data/ghanaRegions';
import { downloadCsv } from '../../utils/csv';
import { formatNumber, timeAgo, toWhatsAppNumber, firstName, cn } from '../../utils/format';

const CHANNEL_LABELS = {
  whatsapp: 'WhatsApp',
  'whatsapp-group': 'WhatsApp group',
  sms: 'SMS',
  'sms-export': 'Bulk SMS export',
  email: 'Email',
};

export default function Messages() {
  return (
    <ProGate
      title="Reach the right voters with the right message"
      description="Build an audience in seconds — undecided voters at Zongo Park, youth in Tema West, every volunteer — then send personalised WhatsApp, SMS or email messages."
      bullets={[
        'Target by support level, region, polling station and tags',
        'Personalised with each voter’s name and polling station',
        'Ready-made templates + AI writer in local languages',
        'Bulk-SMS export for Arkesel, mNotify, Hubtel and others',
      ]}
    >
      <Composer />
    </ProGate>
  );
}

function Composer() {
  const { campaign } = useWorkspace();
  const { rows: voters } = useWorkspaceData('voters');
  const { rows: history } = useWorkspaceData('broadcasts');
  const { toast } = useToast();
  const { copy, copied } = useCopy();

  const [levels, setLevels] = useState([]);
  const [region, setRegion] = useState('');
  const [station, setStation] = useState('');
  const [tag, setTag] = useState('');
  const [message, setMessage] = useState(MESSAGE_TEMPLATES[0].text);
  const [aiBusy, setAiBusy] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);

  const link = `${window.location.origin}/campaign/${campaign.slug}?ref=whatsapp`;
  const candidate = campaign.candidateName || campaign.title;
  const stations = useMemo(() => [...new Set(voters.map((v) => v.pollingStation).filter(Boolean))].sort(), [voters]);
  const tags = useMemo(() => [...new Set(voters.flatMap((v) => v.tags || []))].sort(), [voters]);

  const audience = useMemo(
    () => voters.filter((v) => {
      if (levels.length && !levels.includes(v.supportLevel || 'unknown')) return false;
      if (region && v.region !== region) return false;
      if (station && v.pollingStation !== station) return false;
      if (tag && !(v.tags || []).includes(tag)) return false;
      return !!v.phone;
    }),
    [voters, levels, region, station, tag],
  );
  const withEmail = audience.filter((v) => v.email);

  const audienceLabel = [
    levels.length ? levels.map((l) => (SUPPORT_LEVELS.find((s) => s.id === l) || UNKNOWN_LEVEL).short).join('/') : 'All supporters',
    region,
    station,
    tag && `#${tag}`,
  ].filter(Boolean).join(' · ');

  const sample = fillTemplate(message, { name: firstName(audience[0]?.name || 'Ama'), candidate, link, station: audience[0]?.pollingStation });
  const seg = smsSegments(sample);
  const personalise = (v) => fillTemplate(message, { name: firstName(v.name), candidate, link, station: v.pollingStation });

  const toggleLevel = (id) => setLevels((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const record = (channel) => logBroadcast(campaign.id, { channel, message, audienceLabel, recipients: channel === 'email' ? withEmail.length : audience.length }).catch(() => {});

  const exportSms = () => {
    downloadCsv(`${campaign.slug}-sms-${new Date().toISOString().slice(0, 10)}`, audience, [
      { label: 'phone', get: (v) => v.phone },
      { label: 'name', get: (v) => v.name },
      { label: 'message', get: (v) => personalise(v) },
    ]);
    record('sms-export');
    toast(`Exported ${formatNumber(audience.length)} personalised messages`, 'success');
  };

  const openSmsApp = () => {
    const numbers = audience.slice(0, 20).map((v) => v.phone).join(',');
    const body = fillTemplate(message, { name: '', candidate, link }).replace('Hello friend', 'Hello');
    window.location.href = `sms:${numbers}?body=${encodeURIComponent(body)}`;
    record('sms');
  };

  const openEmail = () => {
    const bcc = withEmail.map((v) => v.email).join(',');
    const body = fillTemplate(message, { name: '', candidate, link }).replace('Hello friend', 'Hello');
    window.location.href = `mailto:?bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(`A message from ${candidate}`)}&body=${encodeURIComponent(body)}`;
    record('email');
  };

  const writeWithAi = async () => {
    setAiBusy(true);
    try {
      const res = await generateStudioDraft({
        campaignId: campaign.id,
        task: 'sms',
        prompt: `Audience: ${audienceLabel}. Purpose: ${message.slice(0, 300)}`,
        language: 'English',
        tone: 'Warm & personal',
      });
      const first = res.text.split(/\n+/).map((l) => l.replace(/^\s*(\d+[.)]|[-*•]|Variant \d+:?)\s*/i, '').replace(/^"|"$/g, '').trim()).find((l) => l.length > 20);
      if (first) setMessage(first);
      toast('AI suggestion added — edit it before sending', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="grid xl:grid-cols-[1fr_1.15fr] gap-6">
      <div className="space-y-6">
        <Card>
          <CardHeader title="1. Choose your audience" icon={Users} subtitle="Only voters with a phone number are included." />
          <p className="label">Support level</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {[...SUPPORT_LEVELS, UNKNOWN_LEVEL].map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => toggleLevel(l.id)}
                className={cn(
                  'h-8 px-3 rounded-full border text-sm transition-colors',
                  levels.includes(l.id) ? 'bg-primary text-primary-fg border-primary' : 'border-line-strong text-ink-2 hover:bg-surface-2',
                )}
              >
                {l.short}
              </button>
            ))}
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Select label="Region" value={region} onChange={(e) => setRegion(e.target.value)} options={GHANA_REGIONS} placeholder="Any" />
            <Select label="Polling station" value={station} onChange={(e) => setStation(e.target.value)} options={stations} placeholder="Any" />
            <Select label="Tag" value={tag} onChange={(e) => setTag(e.target.value)} options={tags} placeholder="Any" />
          </div>
          <div className="mt-5 rounded-xl bg-surface-2 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-ink-2">{audienceLabel}</span>
            <span className="text-lg font-bold text-ink num">{formatNumber(audience.length)}</span>
          </div>
        </Card>

        <Card>
          <CardHeader title="Sent before" icon={History} />
          {history.length === 0 ? (
            <p className="text-sm text-ink-3">Your broadcasts will be logged here.</p>
          ) : (
            <ul className="divide-y divide-line -my-2">
              {history.slice(0, 8).map((h) => (
                <li key={h.id} className="py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <Badge tone="neutral">{CHANNEL_LABELS[h.channel] || h.channel}</Badge>
                    <span className="text-xs text-ink-3">{timeAgo(h.createdAt)} · {formatNumber(h.recipients)} recipients</span>
                  </div>
                  <p className="text-sm text-ink-2 mt-1.5 line-clamp-2">{h.message}</p>
                  <p className="text-xs text-ink-3 mt-0.5">{h.audienceLabel}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader
            title="2. Write your message"
            icon={MessageSquareText}
            action={<Button size="sm" variant="secondary" icon={Sparkles} onClick={writeWithAi} loading={aiBusy}>Improve with AI</Button>}
          />
          <div className="flex flex-wrap gap-1.5 mb-3">
            {MESSAGE_TEMPLATES.map((t) => (
              <button key={t.id} type="button" onClick={() => setMessage(t.text)} className="h-7 px-2.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-xs text-ink-2">
                {t.label}
              </button>
            ))}
          </div>
          <textarea className="input min-h-[140px]" value={message} onChange={(e) => setMessage(e.target.value)} aria-label="Message" />
          <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-xs text-ink-3">
            <span>Merge fields: {'{name} {candidate} {station} {link}'}</span>
            <span className={seg.segments > 2 ? 'text-warning' : ''}>
              {sample.length} chars · {seg.segments} SMS{seg.segments === 1 ? '' : ' segments'}{seg.unicode ? ' (unicode)' : ''}
            </span>
          </div>
          <div className="mt-4 rounded-xl border border-line bg-surface-2 p-4">
            <p className="text-xs font-medium text-ink-3 mb-1.5">Preview for {audience[0]?.name || 'a supporter'}</p>
            <p className="text-sm text-ink whitespace-pre-wrap">{sample}</p>
          </div>
        </Card>

        <Card>
          <CardHeader title="3. Send" icon={Send} subtitle={`${formatNumber(audience.length)} recipients selected`} />
          <div className="grid sm:grid-cols-2 gap-3">
            <ChannelButton icon={MessageCircle} title="WhatsApp, one by one" text="Personal messages from your own number" onClick={() => setQueueOpen(true)} disabled={!audience.length} />
            <ChannelButton icon={Copy} title={copied === 'msg' ? 'Copied!' : 'Copy for groups'} text="Paste into WhatsApp groups or status" onClick={() => { copy(fillTemplate(message, { name: '', candidate, link }).replace('Hello friend', 'Hello'), 'msg'); record('whatsapp-group'); }} />
            <ChannelButton icon={Download} title="Bulk SMS export" text="CSV for Arkesel, mNotify, Hubtel…" onClick={exportSms} disabled={!audience.length} />
            <ChannelButton icon={MessageSquareText} title="Open SMS app" text={`Up to 20 numbers${audience.length > 20 ? ' (first 20)' : ''}`} onClick={openSmsApp} disabled={!audience.length} />
            <ChannelButton icon={Mail} title="Email (BCC)" text={`${formatNumber(withEmail.length)} have an email`} onClick={openEmail} disabled={!withEmail.length} />
          </div>
        </Card>
      </div>

      <WhatsAppQueue
        open={queueOpen}
        onClose={() => setQueueOpen(false)}
        audience={audience}
        personalise={personalise}
        onStart={() => record('whatsapp')}
      />
    </div>
  );
}

function ChannelButton({ icon: Icon, title, text, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-left rounded-xl border border-line-strong p-4 hover:bg-surface-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex gap-3"
    >
      <span className="w-9 h-9 rounded-lg bg-primary-soft text-ink flex items-center justify-center shrink-0">
        <Icon className="w-[18px] h-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{title}</span>
        <span className="block text-xs text-ink-3 mt-0.5">{text}</span>
      </span>
    </button>
  );
}

function WhatsAppQueue({ open, onClose, audience, personalise, onStart }) {
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [skipSent, setSkipSent] = useState(true);
  const [sent, setSent] = useState(() => new Set());
  const v = audience[index];
  if (!open) return null;
  const go = (i) => setIndex(Math.max(0, Math.min(audience.length - 1, i)));
  const openChat = () => {
    if (!started) {
      onStart();
      setStarted(true);
    }
    setSent((s) => new Set(s).add(v.id));
    window.open(`https://wa.me/${toWhatsAppNumber(v.phone)}?text=${encodeURIComponent(personalise(v))}`, '_blank', 'noopener');
    if (skipSent) {
      setTimeout(() => go(index + 1), 300);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Send on WhatsApp"
      subtitle={`${sent.size} of ${audience.length} opened`}
      footer={<Button variant="ghost" onClick={onClose}>Finish</Button>}
    >
      {v ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button size="sm" variant="ghost" icon={ChevronLeft} onClick={() => go(index - 1)} disabled={index === 0}>Prev</Button>
            <span className="text-sm text-ink-3 num">{index + 1} / {audience.length}</span>
            <Button size="sm" variant="ghost" iconRight={ChevronRight} onClick={() => go(index + 1)} disabled={index >= audience.length - 1}>Next</Button>
          </div>
          <div className="rounded-xl border border-line p-4">
            <p className="font-semibold text-ink flex items-center gap-2">
              {v.name} {sent.has(v.id) && <Badge tone="success">Opened</Badge>}
            </p>
            <p className="text-xs text-ink-3 num">{v.phone} · {v.pollingStation || v.region || ''}</p>
            <p className="text-sm text-ink-2 mt-3 whitespace-pre-wrap">{personalise(v)}</p>
          </div>
          <Button block size="lg" icon={MessageCircle} onClick={openChat}>Open WhatsApp chat</Button>
          <Checkbox checked={skipSent} onChange={setSkipSent} label="Move to the next person automatically" />
        </div>
      ) : (
        <EmptyState compact title="No recipients" />
      )}
    </Modal>
  );
}
