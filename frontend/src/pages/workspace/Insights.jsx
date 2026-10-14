import { useEffect, useMemo, useState } from 'react';
import { Eye, UserPlus, QrCode, Percent, Vote, Plus, Trash2 } from 'lucide-react';
import { useWorkspace, useWorkspaceData } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, Button, Input, Modal, Toggle, Select, EmptyState, Segmented } from '../../components/ui';
import { StatTile, LineChart, BarList } from '../../components/charts';
import ProGate from '../../components/billing/ProGate';
import { dailySeries } from '../../services/analyticsService';
import { updateCampaignContent } from '../../services/campaignFirestoreService';
import { GHANA_REGIONS } from '../../data/ghanaRegions';
import { compactNumber, formatNumber, percent } from '../../utils/format';

const SOURCES = [
  ['whatsappVisits', 'WhatsApp'],
  ['facebookVisits', 'Facebook'],
  ['tiktokVisits', 'TikTok'],
  ['instagramVisits', 'Instagram'],
  ['twitterVisits', 'X / Twitter'],
  ['telegramVisits', 'Telegram'],
  ['linkedinVisits', 'LinkedIn'],
  ['qrScans', 'QR code scans'],
  ['adVisitsTotal', 'Tracked ads'],
  ['directVisits', 'Direct / other'],
];

const DEFAULT_POLL = {
  question: 'What is the biggest issue in our community?',
  options: ['Jobs for the youth', 'Roads & transport', 'Water & sanitation', 'Health care', 'Education'],
};

export default function Insights() {
  return (
    <ProGate
      title="See what's working — and what voters care about"
      description="Daily page traffic by source, sign-up conversion, supporter geography and a live issue poll on your campaign page."
      bullets={['30-day traffic trend & sources (WhatsApp, Facebook, QR, ads…)', 'Sign-up conversion rate', 'Supporters by region and constituency', 'Issue poll results by region']}
    >
      <InsightsBoard />
    </ProGate>
  );
}

function InsightsBoard() {
  const { campaign } = useWorkspace();
  const { rows: analytics } = useWorkspaceData('analytics', null);
  const { rows: voters } = useWorkspaceData('voters');
  const { rows: responses } = useWorkspaceData('pollResponses');
  const [range, setRange] = useState(30);
  const [geo, setGeo] = useState('region');
  const [pollRegion, setPollRegion] = useState('');
  const [pollOpen, setPollOpen] = useState(false);

  const a = analytics || {};
  const series = useMemo(() => dailySeries(a.daily, range), [a.daily, range]);
  const signupSeries = useMemo(() => dailySeries(a.dailySignups, range), [a.dailySignups, range]);
  const views = Number(a.totalViews || campaign.views || 0);
  const periodViews = series.reduce((s, d) => s + d.value, 0);
  const periodSignups = signupSeries.reduce((s, d) => s + d.value, 0);
  const signups = Number(a.leadSignups || 0);

  const sources = SOURCES.map(([k, label]) => ({ label, value: Number(a[k] || 0), key: k }))
    .filter((s) => s.value > 0)
    .sort((x, y) => y.value - x.value);

  const geoRows = useMemo(() => {
    const m = {};
    voters.forEach((v) => {
      const k = (geo === 'region' ? v.region : v.constituency) || '';
      if (k) m[k] = (m[k] || 0) + 1;
    });
    return Object.entries(m).map(([label, value]) => ({ label, value })).sort((x, y) => y.value - x.value);
  }, [voters, geo]);

  const poll = campaign.poll?.options?.length ? campaign.poll : null;
  const pollRows = useMemo(() => {
    if (!poll) return [];
    const filtered = pollRegion ? responses.filter((r) => r.region === pollRegion) : responses;
    return poll.options.map((o) => ({ label: o, value: filtered.filter((r) => r.option === o).length }));
  }, [poll, responses, pollRegion]);
  const pollTotal = pollRows.reduce((s, r) => s + r.value, 0);

  const xLabel = (x) => x;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-3">Traffic to your public campaign page</p>
        <Segmented size="sm" value={range} onChange={setRange} options={[{ value: 7, label: '7 days' }, { value: 30, label: '30 days' }, { value: 90, label: '90 days' }]} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label={`Visits · ${range} days`} value={compactNumber(periodViews)} icon={Eye} sub={`${compactNumber(views)} all time`} />
        <StatTile label={`Sign-ups · ${range} days`} value={compactNumber(periodSignups)} icon={UserPlus} sub={`${compactNumber(signups)} all time`} />
        <StatTile label="Conversion" value={periodViews ? percent(periodSignups, periodViews, 1) : '—'} icon={Percent} sub="Visitors who signed up" accent />
        <StatTile label="QR scans" value={compactNumber(a.qrScans || 0)} icon={QrCode} sub="Posters, flyers & banners" />
      </div>

      <Card>
        <CardHeader title="Daily visits" subtitle={`Last ${range} days`} />
        <LineChart data={series} valueLabel="Visits" xFormat={xLabel} />
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Where visitors come from" subtitle="Based on tracked links (?ref=) and QR codes" />
          <BarList items={sources} emptyText="Share your tracked links to see sources here." />
        </Card>
        <Card>
          <CardHeader
            title="Supporters by area"
            action={<Segmented size="sm" value={geo} onChange={setGeo} options={[{ value: 'region', label: 'Region' }, { value: 'constituency', label: 'Constituency' }]} />}
          />
          <BarList items={geoRows} limit={10} emptyText="Add locations to your voters to see their spread." />
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Issue poll"
          icon={Vote}
          subtitle={poll ? `“${poll.question}” · ${formatNumber(pollTotal)} responses` : 'Ask visitors to your page what matters most to them.'}
          action={<Button size="sm" variant={poll ? 'secondary' : 'primary'} onClick={() => setPollOpen(true)}>{poll ? 'Edit poll' : 'Create poll'}</Button>}
        />
        {poll ? (
          <>
            <div className="max-w-xs mb-4">
              <Select value={pollRegion} onChange={(e) => setPollRegion(e.target.value)} options={GHANA_REGIONS} placeholder="All regions" aria-label="Filter by region" />
            </div>
            <BarList items={pollRows} format={(v) => `${formatNumber(v)} · ${pollTotal ? Math.round((v / pollTotal) * 100) : 0}%`} max={Math.max(1, ...pollRows.map((r) => r.value))} />
            {!campaign.sections?.poll && <p className="hint mt-4">The poll is hidden from your page. Edit the poll to show it.</p>}
          </>
        ) : (
          <EmptyState compact icon={Vote} text="Polls are a great way to learn local priorities and collect more sign-ups." />
        )}
      </Card>

      <PollDialog open={pollOpen} onClose={() => setPollOpen(false)} campaign={campaign} />
    </div>
  );
}

function PollDialog({ open, onClose, campaign }) {
  const { toast } = useToast();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState([]);
  const [show, setShow] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const p = campaign.poll?.options?.length ? campaign.poll : DEFAULT_POLL;
    setQuestion(p.question);
    setOptions(p.options);
    setShow(campaign.sections?.poll ?? true);
    // Load saved values only when the dialog opens — live updates (e.g. page views) must not wipe edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const save = async () => {
    const clean = [...new Set(options.map((o) => o.trim()).filter(Boolean))].slice(0, 8);
    if (!question.trim() || clean.length < 2) {
      toast('Add a question and at least two options', 'warning');
      return;
    }
    setSaving(true);
    try {
      await updateCampaignContent(campaign.id, {
        poll: { question: question.trim().slice(0, 140), options: clean.map((o) => o.slice(0, 60)) },
        sections: { ...(campaign.sections || {}), poll: show },
      });
      toast('Poll saved', 'success');
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Issue poll"
      subtitle="Changing options keeps existing answers for options that stay the same."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={save} loading={saving}>Save poll</Button></>}
    >
      <div className="space-y-4">
        <Input label="Question" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={140} />
        <div>
          <p className="label">Options</p>
          <div className="space-y-2">
            {options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <input className="input" value={o} maxLength={60} onChange={(e) => setOptions((l) => l.map((x, j) => (j === i ? e.target.value : x)))} />
                <button type="button" className="btn btn-ghost btn-icon h-11 w-11" onClick={() => setOptions((l) => l.filter((_, j) => j !== i))} aria-label="Remove option">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          {options.length < 8 && <Button className="mt-2" size="sm" variant="ghost" icon={Plus} onClick={() => setOptions((l) => [...l, ''])}>Add option</Button>}
        </div>
        <div className="rounded-xl border border-line p-4">
          <Toggle checked={show} onChange={setShow} label="Show poll on my campaign page" />
        </div>
      </div>
    </Modal>
  );
}
