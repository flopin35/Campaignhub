import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Check, Receipt, RefreshCw, Sparkles, Zap, Printer, ShieldCheck } from 'lucide-react';
import { useWorkspace, useWorkspaceData } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, Button, Badge, EmptyState, KeyValue, Alert } from '../../components/ui';
import { CheckoutDialog } from '../../components/billing/Checkout';
import { cancelAutoRenew } from '../../services/billingService';
import { startTrialForCampaign } from '../../services/campaignFirestoreService';
import { PRO_PLANS, PRO_FEATURES, describeBilling, canStartTrial, formatCedis, formatDay } from '../../utils/billing';
import { formatDate, cn } from '../../utils/format';

export default function Billing() {
  const { campaign, billing } = useWorkspace();
  const { user, userProfile, setUserProfile } = useAuth();
  const { rows: transactions } = useWorkspaceData('transactions');
  const { toast } = useToast();
  const [checkout, setCheckout] = useState(null);
  const [spotlight, setSpotlight] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [starting, setStarting] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const trialAvailable = canStartTrial(userProfile, campaign) && !billing.isPro;
  const paid = transactions.filter((t) => t.status === 'success');

  const stopRenewal = async () => {
    if (!window.confirm('Turn off automatic renewal? Pro stays active until the end of your paid period.')) return;
    setCancelling(true);
    try {
      await cancelAutoRenew(campaign.id);
      toast('Auto-renew turned off', 'info');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setCancelling(false);
    }
  };

  const startTrial = async () => {
    setStarting(true);
    try {
      await startTrialForCampaign(campaign, user.uid);
      setUserProfile?.((p) => ({ ...(p || {}), trialCampaignId: campaign.id }));
      toast('Free trial started — every tool is unlocked for 7 days', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-ink-3">Current plan</p>
              <h2 className="text-2xl font-extrabold text-ink mt-1 flex items-center gap-2">
                {billing.isPro ? (
                  <>
                    <Crown className="w-6 h-6 text-accent" /> {billing.state === 'trialing' ? 'Pro — free trial' : 'CampaignHub Pro'}
                  </>
                ) : (
                  'No active plan'
                )}
              </h2>
              <p className="text-sm text-ink-2 mt-1.5">{describeBilling(billing)}</p>
            </div>
            <Badge tone={billing.tone}>{billing.label}</Badge>
          </div>

          <div className="mt-5 divide-y divide-line border-y border-line">
            {billing.state === 'active' && !billing.legacy && (
              <>
                <KeyValue label="Billing cycle" value={billing.cycle === 'yearly' ? 'Yearly · ₵1,200' : 'Monthly · ₵120'} />
                <KeyValue label="Paid through" value={formatDay(billing.endsAt)} />
                <KeyValue label="Renewal" value={billing.autoRenew ? 'Automatic — card via Paystack' : 'Manual — pay before it ends'} />
                <KeyValue label="Paid with" value={campaign.subscription?.provider === 'flutterwave' ? 'Flutterwave' : 'Paystack'} />
              </>
            )}
            {billing.state === 'trialing' && <KeyValue label="Trial ends" value={formatDay(billing.endsAt)} />}
            <KeyValue label="Public page" value={campaign.endDate ? `Live until ${formatDate(campaign.endDate)}` : 'Not published'} />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {trialAvailable && (
              <Button variant="gold" icon={Sparkles} onClick={startTrial} loading={starting}>Start 7-day free trial</Button>
            )}
            <Button onClick={() => setCheckout(billing.cycle || 'monthly')}>
              {billing.state === 'active' ? 'Pay ahead / renew' : 'Subscribe now'}
            </Button>
            {billing.state === 'active' && billing.cycle !== 'yearly' && (
              <Button variant="secondary" onClick={() => setCheckout('yearly')}>Switch to yearly — save ₵240</Button>
            )}
            {billing.autoRenew && (
              <Button variant="ghost" icon={RefreshCw} onClick={stopRenewal} loading={cancelling}>Turn off auto-renew</Button>
            )}
          </div>
        </Card>

        <Card className="bg-primary text-primary-fg border-primary relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-gold-400/20 blur-2xl" aria-hidden />
          <p className="text-sm opacity-80">Choose your plan</p>
          <div className="mt-4 grid grid-cols-2 gap-3 relative">
            {Object.values(PRO_PLANS).map((p) => (
              <button
                key={p.cycle}
                type="button"
                onClick={() => setCheckout(p.cycle)}
                className={cn('text-left rounded-xl p-4 border transition-colors', 'border-white/20 hover:bg-white/10 dark:border-navy-950/20 dark:hover:bg-navy-950/10')}
              >
                <span className="block text-sm opacity-80">{p.shortName}</span>
                <span className="block text-2xl font-extrabold font-display mt-1">{formatCedis(p.amount)}</span>
                <span className="block text-xs opacity-80">per {p.per}</span>
                {p.savingsLabel && <span className="inline-block mt-2 badge badge-gold h-5 text-[10px]">{p.savingsLabel}</span>}
              </button>
            ))}
          </div>
          <ul className="mt-5 space-y-2 relative">
            {PRO_FEATURES.slice(0, 6).map((f) => (
              <li key={f.title} className="flex gap-2 text-sm">
                <Check className="w-4 h-4 shrink-0 mt-0.5 text-gold-300 dark:text-navy-800" /> {f.title}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs opacity-80 flex items-center gap-1.5 relative">
            <ShieldCheck className="w-4 h-4" /> MoMo or card via Paystack / Flutterwave
          </p>
        </Card>
      </div>

      <Card>
        <CardHeader className="mb-0" title="Spotlight placement" icon={Zap} subtitle="One-time boosts that pin your page to the top of the CampaignHub homepage and directory." action={<Button size="sm" variant="gold" onClick={() => setSpotlight(true)}>Buy Spotlight</Button>} />
      </Card>

      <Card pad={false} className="overflow-hidden">
        <div className="p-5 sm:p-6 pb-0">
          <CardHeader title="Payment history" icon={Receipt} subtitle="Receipts for your treasurer and records." />
        </div>
        {transactions.length === 0 ? (
          <EmptyState compact icon={Receipt} text="No payments yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr><th>Date</th><th>Item</th><th>Reference</th><th className="text-right">Amount</th><th>Status</th><th /></tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap text-sm">{formatDate(t.paidAt || t.createdAt)}</td>
                    <td className="text-ink">{t.itemName}</td>
                    <td className="num text-xs">{t.reference}</td>
                    <td className="text-right num">{formatCedis(t.amount)}</td>
                    <td>
                      <Badge tone={t.status === 'success' ? 'success' : t.status === 'failed' ? 'danger' : 'neutral'}>
                        {t.status === 'success' ? 'Paid' : t.status === 'initialized' ? 'Not completed' : t.status}
                      </Badge>
                    </td>
                    <td>{t.status === 'success' && <Button size="sm" variant="ghost" icon={Printer} onClick={() => setReceipt(t)}>Receipt</Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {paid.length === 0 && billing.state !== 'trialing' && !billing.isPro && (
        <Alert tone="neutral" title="Paid by MoMo but not activated?">
          Payments activate automatically within a minute. If yours hasn&apos;t, email{' '}
          <a className="text-link" href="mailto:campaignhubgh@gmail.com">campaignhubgh@gmail.com</a> with your reference, or visit{' '}
          <Link className="text-link" to="/support">Support</Link>.
        </Alert>
      )}

      <CheckoutDialog open={!!checkout} defaultCycle={checkout || 'monthly'} onClose={() => setCheckout(null)} campaign={campaign} />
      <CheckoutDialog open={spotlight} onClose={() => setSpotlight(false)} campaign={campaign} product="spotlight" />
      {receipt && <ReceiptView tx={receipt} campaign={campaign} email={user?.email} onClose={() => setReceipt(null)} />}
    </div>
  );
}

function ReceiptView({ tx, campaign, email, onClose }) {
  return (
    <div className="fixed inset-0 z-[90] bg-navy-950/60 flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white text-[#0b1526] rounded-2xl w-full max-w-md p-8 shadow-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="font-display font-extrabold text-lg">CampaignHub</p>
          <p className="text-xs text-[#6b7587]">RECEIPT</p>
        </div>
        <div className="mt-6 space-y-2 text-sm">
          <Row k="Receipt no." v={tx.reference} />
          <Row k="Date" v={formatDate(tx.paidAt || tx.createdAt)} />
          <Row k="Billed to" v={email || ''} />
          <Row k="Campaign" v={campaign.title} />
          <Row k="Item" v={tx.itemName} />
          <Row k="Payment method" v={`${tx.provider === 'flutterwave' ? 'Flutterwave' : 'Paystack'}${tx.channel ? ` · ${tx.channel}` : ''}`} />
        </div>
        <div className="mt-6 pt-4 border-t border-[#e2e6ec] flex justify-between items-baseline">
          <span className="text-sm text-[#475265]">Amount paid</span>
          <span className="text-2xl font-extrabold">{formatCedis(tx.amountPaid || tx.amount)}</span>
        </div>
        <p className="mt-6 text-xs text-[#6b7587]">CampaignHub Ghana · campaignhubgh@gmail.com · Thank you for your business.</p>
        <div className="mt-6 flex gap-2 no-print">
          <button type="button" className="btn btn-md bg-[#0f2747] text-white flex-1" onClick={() => printReceipt(tx, campaign, email)}>
            <Printer className="w-4 h-4" /> Print / save PDF
          </button>
          <button type="button" className="btn btn-md border border-[#cbd2dc] text-[#0b1526]" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function printReceipt(tx, campaign, email) {
  const rows = [
    ['Receipt no.', tx.reference],
    ['Date', formatDate(tx.paidAt || tx.createdAt)],
    ['Billed to', email || ''],
    ['Campaign', campaign.title],
    ['Item', tx.itemName],
    ['Payment method', `${tx.provider === 'flutterwave' ? 'Flutterwave' : 'Paystack'}${tx.channel ? ` · ${tx.channel}` : ''}`],
  ].map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`).join('');
  const w = window.open('', '_blank', 'width=520,height=720');
  if (!w) return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Receipt ${escapeHtml(tx.reference)}</title>
<style>body{font-family:Inter,Arial,sans-serif;color:#0b1526;padding:40px;max-width:440px;margin:auto}h1{font-size:20px;margin:0}
.muted{color:#6b7587;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:24px;font-size:14px}td{padding:6px 0}
td:last-child{text-align:right;font-weight:600}.total{display:flex;justify-content:space-between;border-top:1px solid #e2e6ec;margin-top:20px;padding-top:14px}
.total b{font-size:24px}</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:center"><h1>CampaignHub</h1><span class="muted">RECEIPT</span></div>
<table>${rows}</table>
<div class="total"><span>Amount paid</span><b>${escapeHtml(formatCedis(tx.amountPaid || tx.amount))}</b></div>
<p class="muted" style="margin-top:28px">CampaignHub Ghana · campaignhubgh@gmail.com</p>
<script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[#6b7587]">{k}</span>
      <span className="text-right font-medium break-all">{v}</span>
    </div>
  );
}
