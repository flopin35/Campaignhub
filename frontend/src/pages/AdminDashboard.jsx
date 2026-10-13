import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  Search,
  Crown,
  BadgeCheck,
  Star,
  EyeOff,
  Eye,
  Trash2,
  ExternalLink,
  Wallet,
  Users,
  Megaphone,
  Flag,
  Receipt,
  Zap,
  CircleCheck,
  X,
} from 'lucide-react';
import { db } from '../firebase/auth';
import { useAdminCampaigns } from '../hooks/useCampaigns';
import { useToast } from '../context/ToastContext';
import { Card, CardHeader, Button, Badge, PageHeader, Tabs, EmptyState, Modal, Segmented } from '../components/ui';
import { StatTile } from '../components/charts';
import { adminGrantPro, adminEndPro, subscribeBillingTransactions } from '../services/adminService';
import { deleteCampaign, toggleFeatured, toggleCampaignDisabled } from '../services/campaignFirestoreService';
import { verifyCampaign } from '../services/verificationService';
import { clearCampaignBoost } from '../services/boostService';
import { verifyPremiumPayment, verifyPaymentAndActivate, rejectPayment } from '../services/paymentService';
import { subscribeReports, resolveReport } from '../services/reportService';
import { getBillingState, toMs, formatCedis } from '../utils/billing';
import { isCampaignVisible, isBoostActive } from '../utils/campaignHelpers';
import { formatDate, formatNumber, timeAgo, cn } from '../utils/format';

export default function AdminDashboard() {
  const { campaigns, loading } = useAdminCampaigns('');
  const [tab, setTab] = useState('campaigns');
  const [txs, setTxs] = useState([]);
  const [legacy, setLegacy] = useState([]);
  const [reports, setReports] = useState([]);

  useEffect(() => subscribeBillingTransactions(setTxs), []);
  useEffect(() => subscribeReports(setReports), []);
  useEffect(() => {
    getDocs(query(collection(db, 'payments'), where('paymentStatus', '==', 'pending_review')))
      .then((snap) => setLegacy(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(() => setLegacy([]));
  }, [campaigns.length]);

  const stats = useMemo(() => {
    const states = campaigns.map((c) => getBillingState(c));
    const paid = txs.filter((t) => t.status === 'success');
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const active = campaigns.filter((c, i) => states[i].state === 'active' && !states[i].legacy);
    const mrr = active.reduce((s, c) => s + (c.subscription?.cycle === 'yearly' ? 100 : 120), 0);
    return {
      total: campaigns.length,
      live: campaigns.filter(isCampaignVisible).length,
      pro: active.length,
      trialing: states.filter((s) => s.state === 'trialing').length,
      revenue: paid.reduce((s, t) => s + (t.amountPaid || t.amount || 0), 0),
      month: paid.filter((t) => toMs(t.paidAt || t.createdAt) >= monthStart.getTime()).reduce((s, t) => s + (t.amountPaid || t.amount || 0), 0),
      mrr,
    };
  }, [campaigns, txs]);

  const openReports = reports.filter((r) => (r.status || 'open') === 'open');

  return (
    <div className="animate-fade-up">
      <PageHeader eyebrow="Admin" title="CampaignHub control room" subtitle="Subscriptions, payments, campaign pages and reports." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatTile label="Revenue this month" value={formatCedis(stats.month)} icon={Wallet} sub={`${formatCedis(stats.revenue)} all time`} accent />
        <StatTile label="Monthly recurring (est.)" value={formatCedis(stats.mrr)} icon={Crown} sub={`${stats.pro} paying pages`} />
        <StatTile label="On free trial" value={formatNumber(stats.trialing)} icon={Zap} sub="Convert before day 7" />
        <StatTile label="Live pages" value={formatNumber(stats.live)} icon={Megaphone} sub={`${formatNumber(stats.total)} total`} />
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'campaigns', label: 'Campaign pages', icon: Megaphone, count: campaigns.length },
          { value: 'payments', label: 'Payments', icon: Receipt, count: txs.length },
          { value: 'legacy', label: 'Manual MoMo proofs', icon: Wallet, count: legacy.length },
          { value: 'reports', label: 'Reports', icon: Flag, count: openReports.length },
        ]}
      />
      <div className="mt-6">
        {tab === 'campaigns' && <CampaignsTable campaigns={campaigns} loading={loading} />}
        {tab === 'payments' && <PaymentsTable txs={txs} />}
        {tab === 'legacy' && <LegacyPayments payments={legacy} campaigns={campaigns} onDone={(id) => setLegacy((l) => l.filter((p) => p.id !== id))} />}
        {tab === 'reports' && <ReportsList reports={reports} campaigns={campaigns} />}
      </div>
    </div>
  );
}

function CampaignsTable({ campaigns, loading }) {
  const { toast } = useToast();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [grant, setGrant] = useState(null);
  const [busy, setBusy] = useState(null);

  const rows = campaigns.filter((c) => {
    const b = getBillingState(c);
    if (filter === 'pro' && b.state !== 'active') return false;
    if (filter === 'trial' && b.state !== 'trialing') return false;
    if (filter === 'lapsed' && !['grace', 'expired', 'trial_ended', 'unpaid'].includes(b.state)) return false;
    if (q) {
      const t = q.toLowerCase();
      return `${c.title} ${c.ownerName} ${c.ownerEmail} ${c.slug} ${c.constituency}`.toLowerCase().includes(t);
    }
    return true;
  });

  const act = async (c, fn, msg) => {
    setBusy(c.id);
    try {
      await fn();
      if (msg) toast(msg, 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card pad={false} className="overflow-hidden">
      <div className="p-4 sm:p-5 flex flex-col lg:flex-row gap-3 lg:items-center justify-between border-b border-line">
        <div className="relative lg:w-80">
          <Search className="w-4 h-4 text-ink-3 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input className="input pl-10" placeholder="Search title, owner, email…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Segmented value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'pro', label: 'Paying' }, { value: 'trial', label: 'Trial' }, { value: 'lapsed', label: 'Lapsed' }]} />
      </div>
      {loading ? (
        <p className="p-6 text-sm text-ink-3">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState compact text="No campaign pages match." />
      ) : (
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Owner</th>
                <th>Plan</th>
                <th className="text-right">Views</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const b = getBillingState(c);
                return (
                  <tr key={c.id} className={busy === c.id ? 'opacity-60' : ''}>
                    <td>
                      <a href={`/campaign/${c.slug}`} target="_blank" rel="noreferrer" className="font-medium text-ink hover:text-link inline-flex items-center gap-1">
                        {c.title} <ExternalLink className="w-3 h-3" />
                      </a>
                      <span className="flex flex-wrap gap-1 mt-1">
                        {c.verified && <Badge tone="info" className="h-5 text-[10px]">Verified</Badge>}
                        {c.featured && <Badge tone="gold" className="h-5 text-[10px]">Featured</Badge>}
                        {isBoostActive(c) && <Badge tone="gold" className="h-5 text-[10px]">Spotlight</Badge>}
                        {isCampaignVisible(c) ? <Badge tone="success" className="h-5 text-[10px]">Live</Badge> : <Badge className="h-5 text-[10px]">Offline</Badge>}
                      </span>
                    </td>
                    <td className="text-sm">
                      {c.ownerName || '—'}
                      <span className="block text-xs text-ink-3">{c.ownerEmail}</span>
                    </td>
                    <td>
                      <Badge tone={b.tone}>{b.label}</Badge>
                      {b.endsAt && <span className="block text-xs text-ink-3 mt-1">to {formatDate(b.endsAt)}</span>}
                    </td>
                    <td className="text-right num">{formatNumber(c.views)}</td>
                    <td className="text-xs text-ink-3 whitespace-nowrap">{formatDate(c.createdAt)}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <IconBtn title="Grant / extend Pro" icon={Crown} onClick={() => setGrant(c)} />
                        <IconBtn title={c.verified ? 'Remove verified badge' : 'Verify page'} icon={BadgeCheck} active={c.verified} onClick={() => act(c, () => verifyCampaign(c.id, !c.verified, c.ownerId, c.title), c.verified ? 'Badge removed' : 'Page verified')} />
                        <IconBtn title={c.featured ? 'Unfeature' : 'Feature'} icon={Star} active={c.featured} onClick={() => act(c, () => toggleFeatured(c.id, !c.featured))} />
                        {isBoostActive(c) && <IconBtn title="Clear Spotlight" icon={Zap} onClick={() => act(c, () => clearCampaignBoost(c.id, c), 'Spotlight cleared')} />}
                        <IconBtn title={c.disabled ? 'Unhide' : 'Hide from public'} icon={c.disabled ? Eye : EyeOff} onClick={() => act(c, () => toggleCampaignDisabled(c.id, !c.disabled))} />
                        <IconBtn
                          title="Delete"
                          icon={Trash2}
                          danger
                          onClick={() => window.confirm(`Delete "${c.title}" permanently?`) && act(c, () => deleteCampaign(c.id), 'Deleted')}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <GrantDialog campaign={grant} onClose={() => setGrant(null)} />
    </Card>
  );
}

function IconBtn({ icon: Icon, title, onClick, active, danger }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn('btn btn-icon h-8 w-8', danger ? 'btn-danger-ghost' : 'btn-ghost', active && 'text-accent-ink bg-accent-soft')}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

function GrantDialog({ campaign, onClose }) {
  const { toast } = useToast();
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState(false);
  if (!campaign) return null;
  const b = getBillingState(campaign);
  const run = async (fn, msg) => {
    setBusy(true);
    try {
      await fn();
      toast(msg, 'success');
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Manage Pro"
      subtitle={`${campaign.title} · currently ${b.label}`}
      footer={
        <>
          {b.state === 'active' && <Button variant="danger-ghost" className="mr-auto" onClick={() => run(() => adminEndPro(campaign), 'Pro ended')} disabled={busy}>End Pro now</Button>}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => run(() => adminGrantPro(campaign, days), `Granted ${days} days of Pro`)} loading={busy}>Grant {days} days</Button>
        </>
      }
    >
      <p className="text-sm text-ink-2 mb-4">Use this for bank transfers, offline MoMo payments or partner deals. Days are added on top of any remaining time.</p>
      <Segmented value={days} onChange={setDays} options={[{ value: 7, label: '7 days' }, { value: 30, label: '30 days' }, { value: 90, label: '90 days' }, { value: 365, label: '1 year' }]} />
    </Modal>
  );
}

function PaymentsTable({ txs }) {
  const [filter, setFilter] = useState('success');
  const rows = txs.filter((t) => (filter === 'all' ? true : filter === 'success' ? t.status === 'success' : t.status !== 'success'));
  return (
    <Card pad={false} className="overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-line">
        <Segmented value={filter} onChange={setFilter} options={[{ value: 'success', label: 'Paid' }, { value: 'other', label: 'Incomplete' }, { value: 'all', label: 'All' }]} />
      </div>
      {rows.length === 0 ? (
        <EmptyState compact icon={Receipt} text="No payments here yet." />
      ) : (
        <div className="overflow-x-auto">
          <table className="table-base">
            <thead>
              <tr><th>Date</th><th>Campaign</th><th>Item</th><th>Provider</th><th className="text-right">Amount</th><th>Status</th><th>Reference</th></tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td className="text-xs whitespace-nowrap">{formatDate(t.paidAt || t.createdAt)}<span className="block text-ink-3">{timeAgo(t.paidAt || t.createdAt)}</span></td>
                  <td className="text-ink">{t.campaignTitle}<span className="block text-xs text-ink-3">{t.email}</span></td>
                  <td className="text-sm">{t.itemName}</td>
                  <td className="text-sm capitalize">{t.provider}{t.channel ? ` · ${t.channel}` : ''}</td>
                  <td className="text-right num">{formatCedis(t.amountPaid || t.amount)}</td>
                  <td><Badge tone={t.status === 'success' ? 'success' : t.status === 'failed' ? 'danger' : 'neutral'}>{t.status}</Badge></td>
                  <td className="num text-xs">{t.reference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function LegacyPayments({ payments, campaigns, onDone }) {
  const { toast } = useToast();
  const byId = Object.fromEntries(campaigns.map((c) => [c.id, c]));
  if (!payments.length) {
    return <Card><EmptyState icon={CircleCheck} title="No manual proofs waiting" text="New customers pay through Paystack or Flutterwave. Old MoMo screenshot proofs appear here." /></Card>;
  }
  const approve = async (p) => {
    const campaign = byId[p.campaignId];
    if (!campaign) {
      toast('Campaign not found', 'error');
      return;
    }
    try {
      if (p.purchaseType === 'premium' || p.purchaseType === 'hosting') {
        await verifyPremiumPayment({ paymentId: p.id, campaignId: p.campaignId, payment: p, campaign });
      } else {
        await verifyPaymentAndActivate({ paymentId: p.id, campaignId: p.campaignId, campaign, payment: p });
      }
      toast('Payment verified', 'success');
      onDone(p.id);
    } catch (err) {
      toast(err.message, 'error');
    }
  };
  const reject = async (p) => {
    try {
      await rejectPayment({ paymentId: p.id, campaignId: p.campaignId, ownerId: p.userId, reason: 'Payment could not be verified', isPremium: true });
      toast('Rejected', 'info');
      onDone(p.id);
    } catch (err) {
      toast(err.message, 'error');
    }
  };
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {payments.map((p) => (
        <Card key={p.id}>
          <CardHeader title={`${formatCedis(p.amount)} · ${p.packageName}`} subtitle={`${byId[p.campaignId]?.title || p.campaignId} · Ref ${p.paymentReference}`} />
          {p.screenshotUrl && (
            <a href={p.screenshotUrl} target="_blank" rel="noreferrer">
              <img src={p.screenshotUrl} alt="Payment proof" className="max-h-56 rounded-xl border border-line" loading="lazy" />
            </a>
          )}
          <div className="flex gap-2 mt-4">
            <Button size="sm" icon={CircleCheck} onClick={() => approve(p)}>Verify</Button>
            <Button size="sm" variant="ghost" icon={X} onClick={() => reject(p)}>Reject</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function ReportsList({ reports, campaigns }) {
  const { toast } = useToast();
  const byId = Object.fromEntries(campaigns.map((c) => [c.id, c]));
  if (!reports.length) return <Card><EmptyState icon={Flag} title="No reports" /></Card>;
  return (
    <Card pad={false}>
      <ul className="divide-y divide-line">
        {reports.map((r) => (
          <li key={r.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink">{r.reason} <Badge tone={(r.status || 'open') === 'open' ? 'warning' : 'neutral'}>{r.status || 'open'}</Badge></p>
              <p className="text-xs text-ink-3 mt-0.5">{byId[r.campaignId]?.title || r.campaignId} · {timeAgo(r.createdAt)}</p>
              {r.details && <p className="text-sm text-ink-2 mt-1">{r.details}</p>}
            </div>
            {(r.status || 'open') === 'open' && (
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => resolveReport(r.id, 'resolved').then(() => toast('Resolved', 'success'))}>Resolve</Button>
                <Button size="sm" variant="ghost" onClick={() => resolveReport(r.id, 'dismissed').then(() => toast('Dismissed', 'info'))}>Dismiss</Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
