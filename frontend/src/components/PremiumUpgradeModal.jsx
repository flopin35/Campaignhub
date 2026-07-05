import { useCallback, useEffect, useState } from 'react';

import { Link } from 'react-router-dom';

import { motion, AnimatePresence } from 'framer-motion';

import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

import { useAuth } from '../context/AuthContext';

import { db } from '../firebase/auth';

import { normalizeCampaign } from '../utils/campaignHelpers';

import { getPurchasablePlan } from '../data/premiumPackages';

import PremiumUpgradePanel from './PremiumUpgradePanel';

import CampaignSkeleton from './CampaignSkeleton';

import { Sparkles, X, CreditCard, Camera, CheckCircle2 } from './icons/AppIcons';



const CHECKOUT_STEPS = new Set(['pay', 'proof', 'done']);



const HEADER_BY_STEP = {

  pick: {

    title: 'Upgrade Your Campaign',

    icon: Sparkles,

    iconClass: 'bg-brand-600/20 border-brand-500/20 text-brand-400',

  },

  pay: {

    title: 'Send Payment',

    icon: CreditCard,

    iconClass: 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400',

  },

  proof: {

    title: 'Upload Proof',

    icon: Camera,

    iconClass: 'bg-brand-600/20 border-brand-500/20 text-brand-400',

  },

  done: {

    title: 'Payment Submitted',

    icon: CheckCircle2,

    iconClass: 'bg-emerald-500/15 border-emerald-500/20 text-emerald-400',

  },

};



export default function PremiumUpgradeModal({

  isOpen,

  planId,

  variantId,

  presetCampaign,

  presetCampaignId,

  onClose,

}) {

  const { user } = useAuth();

  const [campaigns, setCampaigns] = useState([]);

  const [selectedCampaign, setSelectedCampaign] = useState(null);

  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [checkout, setCheckout] = useState({

    step: 'pick',

    payment: null,

    selected: null,

    variant: null,

  });



  const inCheckout = CHECKOUT_STEPS.has(checkout.step);

  const header = HEADER_BY_STEP[checkout.step] || HEADER_BY_STEP.pick;

  const HeaderIcon = header.icon;



  const handleStepChange = useCallback((state) => {

    setCheckout(state);

  }, []);



  useEffect(() => {

    if (!isOpen) {

      setCheckout({ step: 'pick', payment: null, selected: null, variant: null });

      return;

    }



    if (!isOpen || !user?.uid) {

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
        if (cancelled) return;
        setCampaigns(snap.docs.map(normalizeCampaign));
      })
      .catch(() => {
        if (!cancelled) {
          setCampaigns([]);
          setFetchError('Could not load your campaigns. Check your connection and try again.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };

  }, [isOpen, user?.uid, reloadKey]);



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

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, inCheckout, checkout.step, onClose]);



  const plan = planId ? getPurchasablePlan(planId) : null;

  const planSubtitle = plan?.label || plan?.name;



  const getSubtitle = () => {

    if (checkout.step === 'pay' && checkout.payment) {

      return `Send ₵${checkout.payment.amount} via Telecel Cash · Ref ${checkout.payment.paymentReference}`;

    }

    if (checkout.step === 'proof') {

      return 'Upload your MoMo payment screenshot';

    }

    if (checkout.step === 'done') {

      return 'Awaiting admin verification';

    }

    if (selectedCampaign?.title) {

      return `${planSubtitle || 'Choose a plan'} · ${selectedCampaign.title}`;

    }

    return planSubtitle || 'Choose a plan and complete payment via MoMo';

  };



  const handleBackdropClick = () => {
    if (inCheckout && checkout.step === 'pay') return;
    onClose();
  };



  const handleCloseClick = () => {
    if (inCheckout && checkout.step === 'pay' && checkout.payment) {
      const leave = window.confirm('Close checkout? Your payment reference is saved — you can finish later from My Campaign Pages.');
      if (!leave) return;
    }
    onClose();
  };



  return (

    <AnimatePresence>

      {isOpen && (

        <motion.div

          initial={{ opacity: 0 }}

          animate={{ opacity: 1 }}

          exit={{ opacity: 0 }}

          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md"

          onClick={handleBackdropClick}

        >

          <motion.div

            initial={{ y: 48, opacity: 0, scale: 0.98 }}

            animate={{ y: 0, opacity: 1, scale: 1 }}

            exit={{ y: 32, opacity: 0, scale: 0.98 }}

            transition={{ type: 'spring', damping: 28, stiffness: 320 }}

            onClick={(e) => e.stopPropagation()}

            className={`glass-card w-full flex flex-col overflow-hidden shadow-2xl border transition-all duration-300 ${

              inCheckout

                ? 'max-w-lg max-h-[94vh] border-emerald-500/20 shadow-emerald-500/5'

                : 'max-w-2xl max-h-[92vh] border-brand-500/15'

            }`}

            role="dialog"

            aria-modal="true"

            aria-labelledby="premium-modal-title"

          >

            <div

              className={`flex items-start justify-between gap-4 px-5 sm:px-6 py-4 sm:py-5 border-b shrink-0 ${

                inCheckout ? 'border-emerald-500/15 bg-emerald-500/5' : 'border-surface-border bg-surface-card/50'

              }`}

            >

              <div className="flex gap-3 min-w-0">

                <div

                  className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${header.iconClass}`}

                >

                  <HeaderIcon className="w-5 h-5" />

                </div>

                <div className="min-w-0">

                  <h2 id="premium-modal-title" className="text-lg font-semibold text-white truncate">

                    {header.title}

                  </h2>

                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{getSubtitle()}</p>

                </div>

              </div>

              <button

                type="button"

                onClick={handleCloseClick}

                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface-elevated transition-colors shrink-0"

                aria-label="Close"

              >

                <X className="w-5 h-5" />

              </button>

            </div>



            <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-5 sm:py-6">

              {!user ? (

                <div className="text-center py-10">

                  <p className="text-sm text-gray-400 mb-5">Sign in to purchase premium features for your campaigns.</p>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">

                    <Link to="/login" className="btn-primary text-sm" onClick={onClose}>

                      Sign in

                    </Link>

                    <Link to="/signup" className="btn-secondary text-sm" onClick={onClose}>

                      Create account

                    </Link>

                  </div>

                </div>

              ) : loading ? (

                <CampaignSkeleton count={1} />

              ) : fetchError ? (
                <div className="text-center py-10 rounded-xl border border-red-500/20 bg-red-500/5">
                  <p className="text-sm text-red-300 mb-4">{fetchError}</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="btn-primary text-sm">
                      Try again
                    </button>
                    <button type="button" onClick={onClose} className="btn-secondary text-sm">
                      Close
                    </button>
                  </div>
                </div>
              ) : campaigns.length === 0 ? (

                <div className="text-center py-10 rounded-xl border border-amber-500/20 bg-amber-500/5">

                  <p className="text-sm text-amber-300 mb-4">Launch a campaign first to purchase premium tools.</p>

                  <Link to="/upload" className="btn-primary text-sm" onClick={onClose}>

                    Launch Campaign

                  </Link>

                </div>

              ) : (

                <>

                  {!inCheckout && campaigns.length > 1 && !presetCampaign && (

                    <div className="mb-5">

                      <label htmlFor="premium-campaign-select" className="text-xs font-medium text-gray-500 mb-1.5 block">

                        Apply upgrade to

                      </label>

                      <select

                        id="premium-campaign-select"

                        value={selectedCampaign?.id || ''}

                        onChange={(e) => {

                          const next = campaigns.find((c) => c.id === e.target.value);

                          if (next) setSelectedCampaign(next);

                        }}

                        className="input-field text-sm py-2.5 w-full"

                      >

                        {campaigns.map((c) => (

                          <option key={c.id} value={c.id}>

                            {c.title}

                          </option>

                        ))}

                      </select>

                    </div>

                  )}



                  {!inCheckout && selectedCampaign && campaigns.length === 1 && (
                    <p className="text-xs text-gray-500 mb-4 truncate">
                      Upgrading: <span className="text-gray-300">{selectedCampaign.title}</span>
                    </p>
                  )}

                  {!inCheckout && selectedCampaign && campaigns.length > 1 && (

                    <p className="text-xs text-gray-500 mb-4 text-center">

                      Campaign: <span className="text-gray-300">{selectedCampaign.title}</span>

                    </p>

                  )}



                  {selectedCampaign && (
                    <PremiumUpgradePanel
                      key={selectedCampaign.id}
                      campaign={selectedCampaign}
                      compact
                      embedded
                      initialPlanId={planId}
                      initialVariantId={variantId}
                      onStepChange={handleStepChange}
                      onComplete={onClose}
                    />
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

