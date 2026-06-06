import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { EXTENSION_PACKAGES } from '../data/extensionPackages';
import { requestExtension, submitExtensionProof } from '../services/extensionService';
import { PAYMENT_DETAILS } from '../data/packages';
import { AlertTriangle, X } from './icons/AppIcons';

export default function ExtendCampaignModal({ campaign, onClose }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState('select');
  const [selected, setSelected] = useState(EXTENSION_PACKAGES[0]);
  const [payment, setPayment] = useState(null);
  const [screenshot, setScreenshot] = useState(null);
  const [loading, setLoading] = useState(false);

  const paymentInfo = PAYMENT_DETAILS;

  const handleRequest = async () => {
    setLoading(true);
    try {
      const result = await requestExtension({
        campaignId: campaign.id,
        userId: user.uid,
        pkg: selected,
        campaign,
      });
      setPayment(result);
      setStep('payment');
      toast('Extension request created', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProof = async () => {
    if (!screenshot) {
      toast('Upload payment screenshot', 'warning');
      return;
    }
    setLoading(true);
    try {
      await submitExtensionProof({
        paymentId: payment.id,
        campaignId: campaign.id,
        screenshotFile: screenshot,
      });
      toast('Extension proof submitted — awaiting admin approval', 'success');
      onClose();
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
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          onClick={(e) => e.stopPropagation()}
          className="glass-card w-full max-w-md space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Extend Campaign</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          {step === 'select' && (
            <>
              <p className="text-sm text-gray-400">Extend "{campaign.title}" without creating a new campaign.</p>
              <div className="space-y-2">
                {EXTENSION_PACKAGES.map((pkg) => (
                  <button
                    key={pkg.id}
                    onClick={() => setSelected(pkg)}
                    className={`w-full p-3 rounded-xl border text-left transition-colors ${
                      selected.id === pkg.id
                        ? 'border-brand-500 bg-brand-600/10'
                        : 'border-surface-border bg-surface-elevated'
                    }`}
                  >
                    <div className="flex justify-between">
                      <span className="text-white font-medium">{pkg.label}</span>
                      <span className="text-brand-400">{pkg.price} GHS</span>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={handleRequest} disabled={loading} className="btn-primary w-full">
                Continue to Payment
              </button>
            </>
          )}

          {step === 'payment' && payment && (
            <>
              <div className="p-4 rounded-xl bg-surface-elevated space-y-2 text-sm">
                <p className="text-gray-400">Send <span className="text-white font-bold">{selected.price} GHS</span> via MoMo</p>
                <p className="text-gray-300">Number: <span className="font-mono text-brand-400">{paymentInfo.number}</span></p>
                <p className="text-gray-300">Name: {paymentInfo.receiver}</p>
                <p className="text-gray-300">Reference: <span className="font-mono text-brand-400">{payment.paymentReference}</span></p>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setScreenshot(e.target.files[0])}
                className="text-sm text-gray-400 w-full"
              />
              <button onClick={handleSubmitProof} disabled={loading} className="btn-primary w-full">
                Submit Payment Proof
              </button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function ExtendCampaignBanner({ campaign, onExtend }) {
  if (!campaign?.remainingMs) return null;
  const daysLeft = campaign.remainingMs / (1000 * 60 * 60 * 24);
  if (daysLeft > 7 || daysLeft <= 0) return null;

  return (
    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
      <div>
        <p className="text-amber-400 font-medium text-sm inline-flex items-center gap-2">
          {daysLeft <= 3 && <AlertTriangle className="w-4 h-4 shrink-0" />}
          {daysLeft <= 3 ? 'Campaign expires soon!' : 'Campaign ending soon'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {Math.ceil(daysLeft)} day{Math.ceil(daysLeft) !== 1 ? 's' : ''} remaining — extend to keep visibility.
        </p>
      </div>
      <button onClick={onExtend} className="btn-primary text-sm py-2 px-4 shrink-0">
        Extend Campaign
      </button>
    </div>
  );
}
