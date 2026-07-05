import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createDonation, submitDonationProof, PAYMENT_DETAILS } from '../services/donationService';
import PaymentProofUpload from './PaymentProofUpload';
import { DONATION_TIERS, GHANA_REGIONS, getConstituenciesForRegion } from '../data/ghanaRegions';
import { Wallet, X } from 'lucide-react';

export default function DonateModal({ campaign, onClose }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState('amount');
  const [loading, setLoading] = useState(false);
  const [donation, setDonation] = useState(null);
  const [proofProgress, setProofProgress] = useState(0);
  const [form, setForm] = useState({
    amount: 25,
    customAmount: '',
    donorName: user?.displayName || '',
    donorPhone: '',
    donorEmail: user?.email || '',
    region: '',
    constituency: '',
    anonymous: false,
  });

  const amount = form.customAmount ? Number(form.customAmount) : form.amount;
  const constituencies = getConstituenciesForRegion(form.region);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.donorName.trim() || !form.donorPhone.trim()) {
      toast('Name and phone are required', 'warning');
      return;
    }
    if (!Number.isFinite(amount) || amount < 5) {
      toast('Minimum donation is ₵5', 'warning');
      return;
    }

    setLoading(true);
    try {
      const created = await createDonation({
        campaignId: campaign.id,
        campaignTitle: campaign.title,
        ownerId: campaign.ownerId,
        amount,
        userId: user?.uid || null,
        ...form,
      });
      setDonation(created);
      setStep('pay');
      toast('Donation started — send MoMo with your payment reference', 'success');
    } catch (err) {
      toast(err.message || 'Could not start donation', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleProof = async (file) => {
    setLoading(true);
    try {
      await submitDonationProof({
        donationId: donation.id,
        screenshotFile: file,
        onUploadProgress: setProofProgress,
      });
      setStep('done');
      toast('Thank you! Your donation is pending payment confirmation.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          onClick={(e) => e.stopPropagation()}
          className="modal-sheet glass-card"
        >
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Support this campaign page</h2>
                <p className="text-xs text-gray-500">Official page: {campaign.title}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="text-gray-500 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {step === 'amount' && (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">Amount (GHS)</label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {DONATION_TIERS.map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setForm({ ...form, amount: tier, customAmount: '' })}
                      className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                        form.amount === tier && !form.customAmount
                          ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                          : 'border-surface-border text-gray-400'
                      }`}
                    >
                      ₵{tier}
                    </button>
                  ))}
                </div>
                <input
                  className="input-field"
                  type="number"
                  min="5"
                  placeholder="Custom amount"
                  value={form.customAmount}
                  onChange={(e) => setForm({ ...form, customAmount: e.target.value })}
                />
              </div>
              <input className="input-field" placeholder="Your name *" value={form.donorName} onChange={(e) => setForm({ ...form, donorName: e.target.value })} required />
              <input className="input-field" type="tel" placeholder="MoMo number *" value={form.donorPhone} onChange={(e) => setForm({ ...form, donorPhone: e.target.value })} required />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select className="input-field text-sm" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value, constituency: '' })}>
                  <option value="">Region</option>
                  {GHANA_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <select className="input-field text-sm" value={form.constituency} onChange={(e) => setForm({ ...form, constituency: e.target.value })} disabled={!form.region}>
                  <option value="">Constituency</option>
                  {constituencies.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-500">
                <input type="checkbox" checked={form.anonymous} onChange={(e) => setForm({ ...form, anonymous: e.target.checked })} />
                Donate anonymously on the public donor list
              </label>
              <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-50">
                {loading ? 'Starting…' : `Continue — ₵${amount || 0}`}
              </button>
            </form>
          )}

          {step === 'pay' && donation && (
            <div className="space-y-4">
              <div className="rounded-xl bg-surface-elevated border border-emerald-500/20 p-4 space-y-3 text-sm">
                <p className="text-gray-400">Send <strong className="text-white">₵{donation.amount}</strong> via {PAYMENT_DETAILS.network}</p>
                <div className="flex justify-between"><span className="text-gray-500">Number</span><span className="text-white font-mono">{PAYMENT_DETAILS.number}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="text-white">{PAYMENT_DETAILS.receiver}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Reference</span><span className="text-brand-400 font-mono font-bold">{donation.paymentReference}</span></div>
              </div>
              <p className="text-xs text-amber-400/90">Use the reference exactly — then upload your payment screenshot.</p>
              <button type="button" onClick={() => setStep('proof')} className="btn-primary w-full">I&apos;ve sent the money →</button>
            </div>
          )}

          {step === 'proof' && (
            <PaymentProofUpload onSubmit={handleProof} loading={loading} uploadProgress={proofProgress} embedded />
          )}

          {step === 'done' && (
            <div className="text-center py-6">
              <p className="text-emerald-400 font-semibold text-lg mb-2">Thank you for your support!</p>
              <p className="text-sm text-gray-500 mb-4">Your donation will appear once payment is confirmed by the campaign.</p>
              <button type="button" onClick={onClose} className="btn-primary">Done</button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
