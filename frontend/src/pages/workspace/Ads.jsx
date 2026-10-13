import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Target,
  Plus,
  Pencil,
  Trash2,
  QrCode as QrIcon,
  Copy,
  Zap,
  Sparkles,
  TrendingUp,
  Wallet,
  MousePointerClick,
  UserPlus,
} from 'lucide-react';
import { useWorkspace, useWorkspaceData } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, Button, Input, Select, Textarea, Modal, Badge, EmptyState, useCopy } from '../../components/ui';
import { StatTile, BarList } from '../../components/charts';
import ProGate from '../../components/billing/ProGate';
import { CheckoutDialog } from '../../components/billing/Checkout';
import QrCode from '../../components/QrCode';
import { AD_CHANNELS, createAd, updateAd, deleteAd } from '../../services/workspaceService';
import { GHANA_REGIONS } from '../../data/ghanaRegions';
import { sectionPath } from '../../data/workspaceNav';
import { cedis, formatNumber, percent, formatDateTime } from '../../utils/format';
import { isCampaignVisible, isBoostActive } from '../../utils/campaignHelpers';

const channelLabel = (id) => AD_CHANNELS.find((c) => c.id === id)?.label || id;

export function adLink(campaign, ad) {
  return `${window.location.origin}/campaign/${campaign.slug}?ad=${ad.code}`;
}

export default function Ads() {
  return (
    <ProGate
      title="Know which ads actually win you supporters"
      description="Every Facebook ad, radio mention, billboard and poster gets its own tracked link and QR code. See visits, sign-ups and cost per supporter — so your next cedi goes where it works."
      bullets={[
        'Tracked links & printable QR codes per ad',
        'Visits, sign-ups and conversion for every channel',
        'Cost per supporter across online and offline media',
        'Buy Spotlight placement on the CampaignHub homepage',
      ]}
    >
      <AdsManager />
    </ProGate>
  );
}

function AdsManager() {
  const { campaign } = useWorkspace();
  const { rows: ads } = useWorkspaceData('ads');
  const { rows: voters } = useWorkspaceData('voters');
  const { rows: analytics } = useWorkspaceData('analytics', null);
  const [editing, setEditing] = useState(null);
  const [qrFor, setQrFor] = useState(null);
  const [spotlight, setSpotlight] = useState(false);
  const { copy, copied } = useCopy();

  const signupsByCode = useMemo(() => {
    const m = {};
    voters.forEach((v) => {
      if (v.adCode) m[v.adCode] = (m[v.adCode] || 0) + 1;
    });
    return m;
  }, [voters]);

  const rows = ads.map((ad) => {
    const visits = Number(analytics?.adVisits?.[ad.code] || 0);
    const signups = signupsByCode[ad.code] || Number(analytics?.adSignups?.[ad.code] || 0);
    return {
      ...ad,
      visits,
      signups,
      conversion: visits ? signups / visits : 0,
      cps: signups ? (ad.spent || 0) / signups : null,
    };
  });

  const totals = rows.reduce(
    (t, r) => ({ spent: t.spent + (r.spent || 0), budget: t.budget + (r.budget || 0), visits: t.visits + r.visits, signups: t.signups + r.signups }),
    { spent: 0, budget: 0, visits: 0, signups: 0 },
  );
  const byChannel = Object.values(
    rows.reduce((m, r) => {
      const k = r.channel;
      m[k] = m[k] || { label: channelLabel(k), value: 0, key: k };
      m[k].value += r.signups;
      return m;
    }, {}),
  ).sort((a, b) => b.value - a.value);

  const live = isCampaignVisible(campaign);
  const boosted = isBoostActive(campaign);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Ad spend" value={cedis(totals.spent)} icon={Wallet} sub={totals.budget ? `of ${cedis(totals.budget)} budget` : 'Log spend per ad'} />
        <StatTile label="Visits from ads" value={formatNumber(totals.visits)} icon={MousePointerClick} sub="Tracked link & QR scans" />
        <StatTile label="Supporters from ads" value={formatNumber(totals.signups)} icon={UserPlus} sub={totals.visits ? `${percent(totals.signups, totals.visits, 1)} conversion` : '—'} />
        <StatTile label="Cost per supporter" value={totals.signups ? cedis(totals.spent / totals.signups, { decimals: 2 }) : '—'} icon={TrendingUp} accent />
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
        <Card pad={false} className="overflow-hidden">
          <div className="p-5 sm:p-6 pb-0">
            <CardHeader
              title="Your ads"
              subtitle="Use each ad's tracked link (or QR) in that ad only."
              action={<Button size="sm" icon={Plus} onClick={() => setEditing({})}>New ad</Button>}
            />
          </div>
          {rows.length === 0 ? (
            <EmptyState
              icon={Target}
              title="Track your first ad"
              text="Add the Facebook boost, radio spot or poster run you're paying for. We'll give it a unique link and QR code to measure results."
              action={<Button icon={Plus} onClick={() => setEditing({})}>New ad</Button>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Ad</th>
                    <th className="text-right">Spent</th>
                    <th className="text-right">Visits</th>
                    <th className="text-right">Supporters</th>
                    <th className="text-right">Cost / supporter</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <span className="font-medium text-ink flex items-center gap-2">
                          {r.name}
                          {r.status !== 'active' && <Badge tone="neutral" className="h-5 text-[10px]">{r.status}</Badge>}
                        </span>
                        <span className="block text-xs text-ink-3">{channelLabel(r.channel)}{r.region ? ` · ${r.region}` : ''}</span>
                      </td>
                      <td className="text-right num">{cedis(r.spent)}</td>
                      <td className="text-right num">{formatNumber(r.visits)}</td>
                      <td className="text-right num">
                        {formatNumber(r.signups)}
                        <span className="block text-[11px] text-ink-3">{r.visits ? percent(r.signups, r.visits, 1) : ''}</span>
                      </td>
                      <td className="text-right num font-semibold text-ink">{r.cps != null ? cedis(r.cps, { decimals: 2 }) : '—'}</td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button type="button" className="btn btn-ghost btn-icon h-8 w-8" onClick={() => copy(adLink(campaign, r), r.id)} aria-label="Copy tracked link" title="Copy tracked link">
                            <Copy className={copied === r.id ? 'w-4 h-4 text-success' : 'w-4 h-4'} />
                          </button>
                          <button type="button" className="btn btn-ghost btn-icon h-8 w-8" onClick={() => setQrFor(r)} aria-label="QR code" title="QR code">
                            <QrIcon className="w-4 h-4" />
                          </button>
                          <button type="button" className="btn btn-ghost btn-icon h-8 w-8" onClick={() => setEditing(r)} aria-label="Edit ad">
                            <Pencil className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="border-accent/30">
            <CardHeader title="Spotlight on CampaignHub" icon={Zap} subtitle="Pin your page to the top of our homepage & directory." />
            {boosted ? (
              <p className="text-sm text-ink-2">
                <Badge tone="gold">Live</Badge> <span className="ml-1">{campaign.boostName} until {formatDateTime(campaign.boostExpiresAt)}</span>
              </p>
            ) : (
              <p className="text-sm text-ink-2">From ₵20 for 3 hours to ₵350 for 48 hours on the homepage hero.</p>
            )}
            <Button className="mt-4" variant="gold" icon={Zap} onClick={() => setSpotlight(true)} disabled={!live}>
              {boosted ? 'Extend Spotlight' : 'Buy Spotlight'}
            </Button>
            {!live && <p className="hint">Your page must be live to buy a Spotlight.</p>}
          </Card>
          <Card>
            <CardHeader title="Supporters by channel" />
            <BarList items={byChannel} emptyText="Sign-ups from tracked ads will appear here." />
            <Link to={`${sectionPath(campaign.id, 'studio')}?task=ad`} className="mt-5 inline-flex items-center gap-1.5 text-sm text-link font-medium">
              <Sparkles className="w-4 h-4" /> Write ad copy & radio scripts with AI
            </Link>
          </Card>
        </div>
      </div>

      <AdDialog ad={editing} onClose={() => setEditing(null)} campaign={campaign} />
      <Modal open={!!qrFor} onClose={() => setQrFor(null)} title={qrFor?.name} subtitle="Print this QR on posters, flyers and billboards for this ad only.">
        {qrFor && (
          <div className="flex flex-col items-center gap-4 py-2">
            <QrCode value={adLink(campaign, qrFor)} size={220} filename={`${campaign.slug}-${qrFor.code}`} title={campaign.candidateName || campaign.title} />
            <p className="text-xs text-ink-3 break-all text-center num">{adLink(campaign, qrFor)}</p>
          </div>
        )}
      </Modal>
      <CheckoutDialog open={spotlight} onClose={() => setSpotlight(false)} campaign={campaign} product="spotlight" />
    </div>
  );
}

function AdDialog({ ad, onClose, campaign }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const isNew = ad && !ad.id;
  if (!ad) return null;

  const submit = async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
    setSaving(true);
    try {
      if (isNew) {
        await createAd(campaign.id, fd);
        toast('Ad created — copy its tracked link or QR code', 'success');
      } else {
        await updateAd(ad.id, fd);
        toast('Ad updated', 'success');
      }
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this ad? Visit history stays in Insights.')) return;
    await deleteAd(ad.id).catch((err) => toast(err.message, 'error'));
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={isNew ? 'New ad' : 'Edit ad'}
      footer={
        <>
          {!isNew && <Button variant="danger-ghost" icon={Trash2} onClick={remove} className="mr-auto">Delete</Button>}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="ad-form" loading={saving}>{isNew ? 'Create ad' : 'Save'}</Button>
        </>
      }
    >
      <form id="ad-form" onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
        <Input className="sm:col-span-2" name="name" label="Ad name" required defaultValue={ad.name} placeholder="e.g. Peace FM morning mention — week 1" />
        <Select name="channel" label="Channel" defaultValue={ad.channel || 'facebook'} options={AD_CHANNELS.map((c) => ({ value: c.id, label: c.label }))} />
        <Select name="status" label="Status" defaultValue={ad.status || 'active'} options={[{ value: 'active', label: 'Running' }, { value: 'paused', label: 'Paused' }, { value: 'ended', label: 'Ended' }]} />
        <Input name="budget" label="Budget (₵)" type="number" min="0" step="1" defaultValue={ad.budget} />
        <Input name="spent" label="Spent so far (₵)" type="number" min="0" step="1" defaultValue={ad.spent} />
        <Input name="startDate" label="Start date" type="date" defaultValue={ad.startDate} />
        <Input name="endDate" label="End date" type="date" defaultValue={ad.endDate} />
        <Select name="region" label="Target region" defaultValue={ad.region || ''} options={GHANA_REGIONS} placeholder="Nationwide / any" />
        <Input name="reach" label="Reported reach" type="number" min="0" defaultValue={ad.reach} optional hint="From the platform or station" />
        <Textarea className="sm:col-span-2" name="audience" label="Audience" rows={2} defaultValue={ad.audience} placeholder="e.g. 18–35, Tema & Ashaiman, interested in jobs" optional />
        <Textarea className="sm:col-span-2" name="notes" label="Notes" rows={2} defaultValue={ad.notes} optional />
      </form>
      {!isNew && (
        <div className="mt-5 rounded-xl bg-surface-2 p-4 text-sm">
          <p className="text-ink-3 text-xs mb-1">Tracked link</p>
          <p className="text-ink break-all num">{adLink(campaign, ad)}</p>
        </div>
      )}
    </Modal>
  );
}
