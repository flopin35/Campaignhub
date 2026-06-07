import { useState } from 'react';
import { motion } from 'framer-motion';
import { ALL_PREMIUM_PLANS, HOSTING_PACKAGES } from '../data/premiumPackages';
import { hasPremiumFeature } from '../utils/featureAccess';
import PremiumPackageCard from './PremiumPackageCard';
import PaymentScreen from './PaymentScreen';
import PaymentProofUpload from './PaymentProofUpload';
import { createPremiumPurchase, submitPaymentProof } from '../services/premiumService';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function PremiumUpgradePanel({ campaign, compact = false }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selected, setSelected] = useState(null);
  const [variant, setVariant] = useState(null);
  const [step, setStep] = useState('pick');
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [proofProgress, setProofProgress] = useState(0);
  const [proofError, setProofError] = useState('');

  if (!campaign?.id) return null;

  const handleSelect = (plan) => {
    setSelected(plan);
    setVariant(null);
  };

  const handlePurchase = async () => {
    if (!selected || !user?.uid) return;
    if (selected.variants && !variant) {
      toast('Select a boost duration', 'warning');
      return;
    }
    setLoading(true);
    try {
      const pay = await createPremiumPurchase({
        campaignId: campaign.id,
        userId: user.uid,
        featureId: selected.id,
        variantId: variant?.id,
      });
      setPayment(pay);
      setStep('pay');
      toast('Payment reference generated', 'success');
    } catch (err) {
      toast(err.message || 'Could not start purchase', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleProof = async (file) => {
    setLoading(true);
    setProofError('');
    setProofProgress(0);
    try {
      await submitPaymentProof({
        paymentId: payment.id,
        campaignId: campaign.id,
        userId: user.uid,
        screenshotFile: file,
        onUploadProgress: setProofProgress,
      });
      toast('Payment submitted — pending admin review', 'success');
      setStep('done');
    } catch (err) {
      setProofError(err.message);
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'pay' && payment) {
    const pkg = { name: payment.packageName, price: payment.amount };
    return (
      <div className="space-y-4">
        <PaymentScreen pkg={pkg} paymentReference={payment.paymentReference} onContinue={() => setStep('proof')} />
        <button type="button" onClick={() => setStep('pick')} className="btn-secondary w-full text-sm">← Back</button>
      </div>
    );
  }

  if (step === 'proof') {
    return (
      <div className="space-y-4">
        <PaymentProofUpload onSubmit={handleProof} loading={loading} uploadProgress={proofProgress} uploadError={proofError} />
        <button type="button" onClick={() => setStep('pay')} className="btn-secondary w-full text-sm">← Back</button>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="glass-card text-center p-6 border-emerald-500/20">
        <p className="text-emerald-400 font-medium mb-2">Payment proof received</p>
        <p className="text-sm text-gray-500 mb-1">Reference: <span className="font-mono text-brand-400">{payment?.paymentReference}</span></p>
        <p className="text-xs text-gray-600">Pending review — you'll be notified when activated.</p>
        <button type="button" onClick={() => { setStep('pick'); setSelected(null); setVariant(null); }} className="btn-secondary mt-4 text-sm">
          Done
        </button>
      </div>
    );
  }

  const plans = [...ALL_PREMIUM_PLANS, ...HOSTING_PACKAGES];

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {!compact && (
        <div>
          <h2 className="text-xl font-bold text-white">Upgrade This Campaign</h2>
          <p className="text-sm text-gray-500 mt-1">Pay via Telecel Cash · unique CH- reference · admin verified</p>
        </div>
      )}

      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
        {plans.filter((p) => p.purchasable).map((plan, i) => {
          const active = plan.isBundle
            ? plan.includes?.every((id) => hasPremiumFeature(campaign, id))
            : hasPremiumFeature(campaign, plan.id);
          const isSelected = selected?.id === plan.id;

          return (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <PremiumPackageCard
                plan={plan}
                compact
                selected={isSelected}
                active={active}
                showButton={false}
                onSelect={active ? undefined : handleSelect}
              />
              {plan.variants && isSelected && !active && (
                <div className="flex flex-wrap gap-2 mt-2 px-1">
                  {plan.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVariant(v)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                        variant?.id === v.id
                          ? 'border-brand-500 bg-brand-600/20 text-brand-300'
                          : 'border-surface-border text-gray-400'
                      }`}
                    >
                      {v.label} · ₵{v.price}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {selected && !selected.isBundle && !hasPremiumFeature(campaign, selected.id) && selected.purchaseType !== 'hosting' && (
        <button type="button" onClick={handlePurchase} disabled={loading || (selected.variants && !variant)} className="btn-primary w-full py-3 disabled:opacity-50">
          {loading ? 'Generating reference…' : selected.button || `Get ${selected.name}`}
        </button>
      )}

      {selected?.isBundle && (
        <button type="button" onClick={handlePurchase} disabled={loading} className="btn-primary w-full py-3 disabled:opacity-50">
          {loading ? 'Generating reference…' : selected.button}
        </button>
      )}

      {selected?.purchaseType === 'hosting' && (
        <button type="button" onClick={handlePurchase} disabled={loading} className="btn-primary w-full py-3 disabled:opacity-50">
          {loading ? 'Generating reference…' : 'Extend Campaign'}
        </button>
      )}
    </div>
  );
}
