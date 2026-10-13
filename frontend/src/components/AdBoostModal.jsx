import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { Zap, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { db } from '../firebase/auth';
import { normalizeCampaign } from '../utils/campaignHelpers';
import { PREMIUM_FEATURE_IDS } from '../data/premiumPackages';
import { createPremiumPurchase, submitPaymentProof, getPaymentForPlan } from '../services/premiumService';
import AdBoostPricing from './AdBoostPricing';
import PaymentScreen from './PaymentScreen';
import PaymentProofUpload from './PaymentProofUpload';
import CampaignSkeleton from './CampaignSkeleton';

const STEPS = { pick: 'pick', pay: 'pay', done: 'done' };

export default function AdBoostModal({
  isOpen,
  presetCampaign,
  presetCampaignId,
  initialVariantId = null,
  onClose,
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [step, setStep] = useState(STEPS.pick);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [payment, setPayment] = useState(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [proofProgress, setProofProgress] = useState(0);
  const [proofError, setProofError] = useState('');
  const autoStarted = useRef(false);

  const reset = useCallback(() => {
    setStep(STEPS.pick);
    setSelectedPkg(null);
    setPayment(null);
    setProofError('');
    autoStarted.current = false;
  }, []);

  useEffect(() => {
    if (!isOpen) {
      reset();
      return undefined;
    }

    if (!user?.uid) {
      setCampaigns([]);
      return undefined;
    }

    setLoading(true);
    setFetchError('');
    const q = query(
      collection(db, 'campaigns'),
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'desc'),
    );

    let cancelled = false;
    getDocs(q)
      .then((snap) => {
        if (!cancelled) setCampaigns(snap.docs.map(normalizeCampaign));
      })
      .catch(() => {
        if (!cancelled) {
          setCampaigns([]);
          setFetchError('Could not load campaigns. Check your connection.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isOpen, user?.uid, reloadKey, reset]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedCampaign(null);
      return;
    }
    if (presetCampaign) {
      setSelectedCampaign(presetCampaign);
      return;
    }
    if (!campaigns.length) return;
    if (presetCampaignId) {
      const found = campaigns.find((c) => c.id === presetCampaignId);
      if (found) {
        setSelectedCampaign(found);
        return;
      }
    }
    const preferred = campaigns.find((c) => c.status === 'active' && !c.isExpired) || campaigns[0];
    setSelectedCampaign(preferred);
  }, [isOpen, presetCampaign, presetCampaignId, campaigns]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  const startPurchase = useCallback(async (pkg, campaign) => {
    if (!pkg || !campaign?.id || !user?.uid || purchaseLoading) return;

    setPurchaseLoading(true);
    setSelectedPkg(pkg);
    setProofError('');

    try {
      const existing = await getPaymentForPlan({
        campaignId: campaign.id,
        userId: user.uid,
        premiumFeatureId: PREMIUM_FEATURE_IDS.VISIBILITY_BOOST,
        variantId: pkg.id,
        purchaseType: 'premium',
      });

      if (existing) {
        setPayment(existing);
        if (existing.paymentStatus === 'pending_review' || existing.awaitingReview) {
          setStep(STEPS.done);
        } else {
          setStep(STEPS.pay);
        }
        return;
      }

      const pay = await createPremiumPurchase({
        campaignId: campaign.id,
        userId: user.uid,
        featureId: PREMIUM_FEATURE_IDS.VISIBILITY_BOOST,
        variantId: pkg.id,
      });

      setPayment(pay);
      setStep(STEPS.pay);
      try {
        await navigator.clipboard.writeText(pay.paymentReference);
        toast(`Reference copied — send ${pay.amount} GHS via MoMo`, 'success');
      } catch {
        toast('Payment reference ready', 'success');
      }
    } catch (err) {
      toast(err.message || 'Could not start boost', 'error');
      setSelectedPkg(null);
      setStep(STEPS.pick);
    } finally {
      setPurchaseLoading(false);
    }
  }, [user?.uid, purchaseLoading, toast]);

  useEffect(() => {
    if (!isOpen || !initialVariantId || !selectedCampaign?.id || autoStarted.current) return;
    autoStarted.current = true;
    const pkg = { id: initialVariantId };
    startPurchase(pkg, selectedCampaign);
  }, [isOpen, initialVariantId, selectedCampaign, startPurchase]);

  const handleSelectTier = (pkg) => {
    if (!selectedCampaign) return;
    startPurchase(pkg, selectedCampaign);
  };

  const handleProof = async (file) => {
    if (!payment?.id || !selectedCampaign?.id || !user?.uid) return;
    setPurchaseLoading(true);
    setProofError('');
    setProofProgress(0);
    try {
      await submitPaymentProof({
        paymentId: payment.id,
        campaignId: selectedCampaign.id,
        userId: user.uid,
        screenshotFile: file,
        onUploadProgress: setProofProgress,
      });
      toast('Boost payment submitted — pending review', 'success');
      setStep(STEPS.done);
    } catch (err) {
      setProofError(err.message);
      toast(err.message, 'error');
    } finally {
      setPurchaseLoading(false);
    }
  };

  const headerTitle = step === STEPS.done
    ? 'Boost Submitted'
    : step === STEPS.pay
      ? 'Pay for Boost'
      : 'Ad Boost';

  const headerSub = step === STEPS.done
    ? 'Awaiting admin verification'
    : step === STEPS.pay && payment
      ? `Send ${payment.amount} GHS · Ref ${payment.paymentReference}`
      : selectedCampaign?.title
        ? `Boost "${selectedCampaign.title}"`
        : 'Get homepage spotlight & priority ranking';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md"
          onClick={() => { if (step === STEPS.pick) onClose(); }}
        >
          <motion.div
            initial={{ y: 48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="modal-sheet glass-card w-full sm:max-w-lg flex flex-col overflow-hidden border-amber-500/20 shadow-2xl max-h-[94dvh]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="boost-modal-title"
          >
            <div className="flex items-start justify-between gap-3 px-4 sm:px-5 py-4 border-b border-amber-500/15 bg-amber-500/5 shrink-0">
              <div className="flex gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <h2 id="boost-modal-title" className="text-lg font-semibold text-white">{headerTitle}</h2>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{headerSub}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="touch-target p-2 rounded-lg text-gray-400 hover:text-white hover:bg-surface-elevated shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-4 sm:px-5 py-4 sm:py-5">
              {!user ? (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-400 mb-4">Sign in to spotlight your campaign page in the directory.</p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Link to="/login" className="btn-primary text-sm" onClick={onClose}>Sign in</Link>
                    <Link to="/signup" className="btn-secondary text-sm" onClick={onClose}>Create account</Link>
                  </div>
                </div>
              ) : loading ? (
                <CampaignSkeleton count={1} />
              ) : fetchError ? (
                <div className="text-center py-8">
                  <p className="text-sm text-red-300 mb-4">{fetchError}</p>
                  <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="btn-primary text-sm">Try again</button>
                </div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-8 rounded-xl border border-amber-500/20 bg-amber-500/5">
                  <p className="text-sm text-amber-300 mb-4">Launch a campaign page first, then add directory spotlight.</p>
                  <Link to="/upload" className="btn-primary text-sm" onClick={onClose}>Launch Campaign Page</Link>
                </div>
              ) : (
                <>
                  {step === STEPS.pick && campaigns.length > 1 && !presetCampaign && (
                    <div className="mb-4">
                      <label htmlFor="boost-campaign-select" className="text-xs font-medium text-gray-500 mb-1.5 block">
                        Campaign page to spotlight
                      </label>
                      <select
                        id="boost-campaign-select"
                        value={selectedCampaign?.id || ''}
                        onChange={(e) => {
                          const next = campaigns.find((c) => c.id === e.target.value);
                          if (next) setSelectedCampaign(next);
                        }}
                        className="input-field text-sm py-2.5 w-full"
                      >
                        {campaigns.map((c) => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {step === STEPS.pick && (
                    <>
                      {purchaseLoading && (
                        <p className="text-sm text-amber-400 text-center mb-4 animate-pulse">Generating payment reference…</p>
                      )}
                      <AdBoostPricing
                        selectedId={selectedPkg?.id}
                        onSelect={handleSelectTier}
                      />
                      <p className="text-[11px] text-gray-600 text-center mt-4">Tap a duration — payment reference generates instantly</p>
                    </>
                  )}

                  {step === STEPS.pay && payment && (
                    <div className="space-y-4">
                      <PaymentScreen
                        pkg={{ name: payment.packageName, price: payment.amount }}
                        paymentReference={payment.paymentReference}
                        step={1}
                        embedded
                        hideContinue
                      />
                      <PaymentProofUpload
                        onSubmit={handleProof}
                        loading={purchaseLoading}
                        uploadProgress={proofProgress}
                        uploadError={proofError}
                        embedded
                        step={2}
                      />
                      <button
                        type="button"
                        onClick={reset}
                        className="btn-secondary w-full text-sm"
                      >
                        ← Choose different duration
                      </button>
                    </div>
                  )}

                  {step === STEPS.done && (
                    <div className="text-center py-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                      <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl text-emerald-400">✓</span>
                      </div>
                      <p className="text-emerald-400 font-semibold text-lg mb-2">Boost payment received</p>
                      <p className="text-sm text-gray-500 mb-1">
                        Ref: <span className="font-mono text-brand-400">{payment?.paymentReference}</span>
                      </p>
                      <p className="text-xs text-gray-600 mb-6">Your boost activates after admin verification.</p>
                      <button type="button" onClick={onClose} className="btn-primary text-sm px-8">Done</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
