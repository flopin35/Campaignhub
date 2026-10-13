import { useEffect, useState } from 'react';
import { HandCoins, Plus, Download, Check, X, Smartphone, Settings2 } from 'lucide-react';
import { useWorkspace, useWorkspaceData } from '../../context/WorkspaceContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, Button, Input, Select, Modal, Badge, EmptyState, Toggle, Alert } from '../../components/ui';
import { StatTile, Meter, BarList } from '../../components/charts';
import ProGate from '../../components/billing/ProGate';
import { getDonationStats, verifyDonation, rejectDonation, recordOfflineDonation } from '../../services/donationService';
import { updateCampaignContent } from '../../services/campaignFirestoreService';
import { downloadCsv } from '../../utils/csv';
import { cedis, formatNumber, timeAgo, formatDate } from '../../utils/format';

const NETWORKS = ['MTN MoMo', 'Telecel Cash', 'AT Money'];

export default function Fundraising() {
  return (
    <ProGate
      title="Raise money from your supporters — straight to your MoMo"
      description="Turn on a donate button on your campaign page. Supporters send MoMo to your campaign number with a reference; you confirm each gift and track progress to your goal."
      bullets={['Donations go directly to your campaign MoMo', 'Unique reference on every gift', 'Fundraising goal & donor leaderboard', 'Record cash gifts and export for your treasurer']}
    >
      <FundraisingManager />
    </ProGate>
  );
}

function FundraisingManager() {
  const { campaign } = useWorkspace();
  const { rows: donations } = useWorkspaceData('donations');
  const { toast } = useToast();
  const [setupOpen, setSetupOpen] = useState(false);
  const [offlineOpen, setOfflineOpen] = useState(false);

  const stats = getDonationStats(donations);
  const goal = Number(campaign.donation?.goal || 0);
  const pending = donations.filter((d) => ['pending_review', 'pending'].includes(d.paymentStatus));
  const enabled = !!campaign.sections?.donate && !!campaign.donation?.number;

  const confirm = async (d) => {
    try {
      await verifyDonation(d.id, { ownerId: campaign.ownerId, campaignTitle: campaign.title, donorName: d.donorName, amount: d.amount });
      toast(`${cedis(d.amount)} from ${d.donorName} confirmed`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };
  const reject = async (d) => {
    if (!window.confirm(`Mark ${d.paymentReference} as not received?`)) return;
    await rejectDonation(d.id).catch((err) => toast(err.message, 'error'));
  };

  const exportAll = () => downloadCsv(`${campaign.slug}-donations`, donations, [
    { label: 'Date', get: (d) => formatDate(d.createdAt) },
    { key: 'donorName', label: 'Donor' },
    { key: 'donorPhone', label: 'Phone' },
    { key: 'amount', label: 'Amount (GHS)' },
    { key: 'paymentReference', label: 'Reference' },
    { key: 'momoTxnId', label: 'MoMo transaction ID' },
    { key: 'paymentStatus', label: 'Status' },
    { key: 'method', label: 'Method' },
  ]);

  return (
    <div className="space-y-6">
      {!enabled && (
        <Alert
          tone="gold"
          icon={Smartphone}
          title="Turn on donations"
          action={<Button size="sm" variant="gold" onClick={() => setSetupOpen(true)}>Set up MoMo</Button>}
        >
          Add your campaign MoMo number to show a Donate button on your public page.
        </Alert>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Confirmed" value={cedis(stats.totalRaised)} icon={HandCoins} accent />
        <StatTile label="Donors" value={formatNumber(stats.donorCount)} sub={stats.averageGift ? `Avg ${cedis(stats.averageGift)}` : undefined} />
        <StatTile label="To confirm" value={formatNumber(pending.length)} sub={pending.length ? cedis(pending.reduce((s, d) => s + (d.amount || 0), 0)) : 'All caught up'} />
        <StatTile label="Goal" value={goal ? cedis(goal) : '—'} sub={goal ? `${Math.round((stats.totalRaised / goal) * 100)}% reached` : 'Set a goal'} />
      </div>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6">
        <div className="space-y-6">
          <Card pad={false} className="overflow-hidden">
            <div className="p-5 sm:p-6 pb-0">
              <CardHeader
                title="Awaiting confirmation"
                subtitle="Check your MoMo statement for the reference, then confirm."
                action={
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" icon={Settings2} onClick={() => setSetupOpen(true)}>Settings</Button>
                    <Button size="sm" icon={Plus} onClick={() => setOfflineOpen(true)}>Record gift</Button>
                  </div>
                }
              />
            </div>
            {pending.length === 0 ? (
              <EmptyState compact icon={HandCoins} text="No donations waiting. New gifts from your page will appear here." />
            ) : (
              <ul className="divide-y divide-line">
                {pending.map((d) => (
                  <li key={d.id} className="px-5 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink">{cedis(d.amount)} · {d.anonymous ? `${d.donorName} (anonymous)` : d.donorName}</p>
                      <p className="text-xs text-ink-3 mt-0.5 num">
                        Ref {d.paymentReference}{d.momoTxnId ? ` · MoMo ID ${d.momoTxnId}` : ''} · {d.donorPhone} · {timeAgo(d.createdAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" icon={Check} onClick={() => confirm(d)}>Received</Button>
                      <Button size="sm" variant="ghost" icon={X} onClick={() => reject(d)}>Not received</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card pad={false} className="overflow-hidden">
            <div className="p-5 sm:p-6 pb-0">
              <CardHeader title="All donations" action={<Button size="sm" variant="secondary" icon={Download} onClick={exportAll} disabled={!donations.length}>Export</Button>} />
            </div>
            {donations.length === 0 ? (
              <EmptyState compact text="No donations yet." />
            ) : (
              <div className="overflow-x-auto max-h-[420px]">
                <table className="table-base">
                  <thead>
                    <tr><th>Donor</th><th className="text-right">Amount</th><th>Reference</th><th>Status</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {donations.map((d) => (
                      <tr key={d.id}>
                        <td className="text-ink">{d.donorName}</td>
                        <td className="text-right num">{cedis(d.amount)}</td>
                        <td className="num text-xs">{d.paymentReference}</td>
                        <td>
                          <Badge tone={d.paymentStatus === 'verified' ? 'success' : d.paymentStatus === 'rejected' ? 'danger' : 'warning'}>
                            {d.paymentStatus === 'verified' ? 'Confirmed' : d.paymentStatus === 'rejected' ? 'Not received' : 'Pending'}
                          </Badge>
                        </td>
                        <td className="text-xs text-ink-3 whitespace-nowrap">{formatDate(d.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Goal progress" />
            {goal ? (
              <Meter value={stats.totalRaised} max={goal} size="lg" label={`${cedis(stats.totalRaised)} raised`} valueLabel={`of ${cedis(goal)}`} />
            ) : (
              <p className="text-sm text-ink-3">Set a fundraising goal to show progress here and on your page.</p>
            )}
          </Card>
          <Card>
            <CardHeader title="Top donors" subtitle="Confirmed, excluding anonymous" />
            <BarList items={stats.leaderboard.map((d) => ({ label: d.name, value: d.amount }))} format={(v) => cedis(v)} emptyText="Your biggest supporters will appear here." />
          </Card>
        </div>
      </div>

      <DonationSetup open={setupOpen} onClose={() => setSetupOpen(false)} campaign={campaign} />
      <OfflineGift open={offlineOpen} onClose={() => setOfflineOpen(false)} campaign={campaign} />
    </div>
  );
}

function DonationSetup({ open, onClose, campaign }) {
  const { toast } = useToast();
  const [form, setForm] = useState({});
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setForm({ network: 'MTN MoMo', number: '', name: '', goal: '', note: '', ...(campaign.donation || {}) });
    setShow(!!campaign.sections?.donate);
  }, [open, campaign.donation, campaign.sections]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateCampaignContent(campaign.id, {
        donation: {
          network: form.network,
          number: String(form.number || '').trim(),
          name: String(form.name || '').trim(),
          goal: Number(form.goal) || 0,
          note: String(form.note || '').slice(0, 200),
        },
        sections: { ...(campaign.sections || {}), donate: show && !!String(form.number || '').trim() },
      });
      toast('Donation settings saved', 'success');
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
      title="Donation settings"
      subtitle="Gifts go directly to this MoMo account."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" form="donation-setup" loading={saving}>Save</Button></>}
    >
      <form id="donation-setup" onSubmit={save} className="grid sm:grid-cols-2 gap-4">
        <Select label="Network" value={form.network || ''} onChange={set('network')} options={NETWORKS} />
        <Input label="MoMo number" required inputMode="tel" value={form.number || ''} onChange={set('number')} />
        <Input className="sm:col-span-2" label="Registered account name" required value={form.name || ''} onChange={set('name')} hint="Exactly as it appears when donors send money" />
        <Input label="Fundraising goal (₵)" type="number" min="0" value={form.goal || ''} onChange={set('goal')} optional />
        <Input label="Short appeal" value={form.note || ''} onChange={set('note')} placeholder="Help us print 10,000 flyers" optional />
        <div className="sm:col-span-2 rounded-xl border border-line p-4">
          <Toggle checked={show} onChange={setShow} label="Show Donate button on my campaign page" />
        </div>
      </form>
    </Modal>
  );
}

function OfflineGift({ open, onClose, campaign }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
    setSaving(true);
    try {
      await recordOfflineDonation(campaign.id, fd);
      toast('Gift recorded', 'success');
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
      title="Record a gift"
      subtitle="Cash, bank transfer or a MoMo payment you received directly."
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" form="offline-gift" loading={saving}>Record</Button></>}
    >
      <form id="offline-gift" onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
        <Input name="donorName" label="Donor name" required />
        <Input name="donorPhone" label="Phone" inputMode="tel" optional />
        <Input name="amount" label="Amount (₵)" type="number" min="5" step="0.01" required />
        <Select name="method" label="Method" options={[{ value: 'cash', label: 'Cash' }, { value: 'momo', label: 'MoMo' }, { value: 'bank', label: 'Bank transfer' }, { value: 'cheque', label: 'Cheque' }]} />
        <Input className="sm:col-span-2" name="note" label="Note" optional />
      </form>
    </Modal>
  );
}
