import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, Copy, Check, RotateCcw, Mic, Megaphone, MessageSquare, Smartphone, DoorOpen, Newspaper, ScrollText, Lightbulb, Compass } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, Button, Select, Badge, EmptyState, useCopy } from '../../components/ui';
import ProGate from '../../components/billing/ProGate';
import { STUDIO_TASKS, STUDIO_LANGUAGES, STUDIO_TONES, generateStudioDraft } from '../../services/aiService';
import { cn, timeAgo } from '../../utils/format';

const ICONS = {
  speech: Mic,
  social: MessageSquare,
  ad: Megaphone,
  sms: Smartphone,
  doorstep: DoorOpen,
  statement: Newspaper,
  manifesto: ScrollText,
  slogan: Lightbulb,
  strategy: Compass,
};

export default function Studio() {
  return (
    <ProGate
      title="Your AI speechwriter and comms team"
      description="Draft rally speeches, radio scripts, social posts, SMS blasts, press statements and canvassing scripts — in English, Twi, Ga, Ewe, Hausa, Fante, Dagbani or Pidgin."
      bullets={['Knows your candidate, constituency and priorities', '9 ready-made writing tasks', 'Local-language drafts', 'Strategy advisor for your next 14 days']}
    >
      <StudioDesk />
    </ProGate>
  );
}

function StudioDesk() {
  const { campaign } = useWorkspace();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const [task, setTask] = useState(() => (STUDIO_TASKS.some((t) => t.id === params.get('task')) ? params.get('task') : 'speech'));
  const [language, setLanguage] = useState('English');
  const [tone, setTone] = useState('Inspiring');
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [remaining, setRemaining] = useState(null);
  const { copy, copied } = useCopy();

  const meta = STUDIO_TASKS.find((t) => t.id === task);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(`ch-studio-${campaign.id}`) || '[]');
      if (Array.isArray(saved)) setDrafts(saved);
    } catch {
      /* ignore */
    }
  }, [campaign.id]);

  const persist = (list) => {
    setDrafts(list);
    try {
      sessionStorage.setItem(`ch-studio-${campaign.id}`, JSON.stringify(list.slice(0, 10)));
    } catch {
      /* ignore */
    }
  };

  const generate = async (e) => {
    e?.preventDefault();
    if (prompt.trim().length < 5) {
      toast('Tell the AI a little more about what you need.', 'warning');
      return;
    }
    setBusy(true);
    try {
      const res = await generateStudioDraft({ campaignId: campaign.id, task, prompt, language, tone });
      setRemaining(res.remainingToday);
      persist([{ id: Date.now(), task, language, tone, prompt, text: res.text, at: Date.now() }, ...drafts].slice(0, 10));
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid xl:grid-cols-[minmax(0,420px)_1fr] gap-6 items-start">
      <Card as="form" onSubmit={generate} className="xl:sticky xl:top-24">
        <CardHeader title="What should we write?" icon={Sparkles} />
        <div className="grid grid-cols-3 gap-2 mb-5">
          {STUDIO_TASKS.map((t) => {
            const Icon = ICONS[t.id] || Sparkles;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTask(t.id)}
                className={cn(
                  'rounded-xl border px-2 py-3 text-center transition-colors',
                  task === t.id ? 'border-primary bg-primary-soft/50 ring-2 ring-primary/10' : 'border-line hover:bg-surface-2',
                )}
              >
                <Icon className="w-5 h-5 mx-auto text-ink-2" />
                <span className="block mt-1.5 text-[12px] font-medium text-ink leading-tight">{t.label}</span>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Select label="Language" value={language} onChange={(e) => setLanguage(e.target.value)} options={STUDIO_LANGUAGES} />
          <Select label="Tone" value={tone} onChange={(e) => setTone(e.target.value)} options={STUDIO_TONES} />
        </div>
        <label className="label" htmlFor="studio-prompt">Brief</label>
        <textarea
          id="studio-prompt"
          className="input min-h-[140px]"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={meta?.hint}
          maxLength={4000}
        />
        <p className="hint">The AI already knows your candidate, office, constituency and priorities from your campaign page.</p>
        <Button type="submit" block size="lg" icon={Sparkles} loading={busy} className="mt-5">
          {busy ? 'Writing…' : 'Generate draft'}
        </Button>
        {remaining != null && <p className="text-xs text-ink-3 text-center mt-2">{remaining} drafts left today</p>}
      </Card>

      <div className="space-y-4">
        {drafts.length === 0 && !busy && (
          <Card>
            <EmptyState
              icon={Sparkles}
              title="Your drafts appear here"
              text="Pick a task, add a short brief and generate. Always review facts and figures before you publish."
            />
          </Card>
        )}
        {busy && (
          <Card>
            <div className="space-y-3">
              {[92, 80, 96, 64, 88].map((w) => <div key={w} className="skeleton h-3" style={{ width: `${w}%` }} />)}
            </div>
          </Card>
        )}
        {drafts.map((d) => (
          <Card key={d.id}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="navy">{STUDIO_TASKS.find((t) => t.id === d.task)?.label}</Badge>
                <Badge>{d.language}</Badge>
                <Badge>{d.tone}</Badge>
                <span className="text-xs text-ink-3">{timeAgo(d.at)}</span>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="ghost" icon={RotateCcw} onClick={() => { setTask(d.task); setLanguage(d.language); setTone(d.tone); setPrompt(d.prompt); }}>
                  Reuse brief
                </Button>
                <Button size="sm" variant="secondary" icon={copied === d.id ? Check : Copy} onClick={() => copy(d.text, d.id)}>
                  {copied === d.id ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
            <div className="text-[15px] leading-relaxed text-ink whitespace-pre-wrap">{d.text}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
