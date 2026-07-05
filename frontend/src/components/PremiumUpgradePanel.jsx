import { useState, useEffect, useRef } from 'react';

import { motion } from 'framer-motion';

import { ALL_PREMIUM_PLANS, HOSTING_PACKAGES, getPurchasablePlan, resolvePlanId, PREMIUM_FEATURE_IDS } from '../data/premiumPackages';

import { hasPremiumFeature } from '../utils/featureAccess';

import PremiumPackageCard from './PremiumPackageCard';

import PaymentScreen from './PaymentScreen';

import PaymentProofUpload from './PaymentProofUpload';

import { createPremiumPurchase, submitPaymentProof, getPaymentForPlan } from '../services/premiumService';

import { useToast } from '../context/ToastContext';

import { useAuth } from '../context/AuthContext';



function getPurchaseMeta(selected, variant) {

  if (!selected) return null;

  const purchaseType = selected.purchaseType === 'hosting' ? 'hosting' : 'premium';

  return {

    premiumFeatureId: selected.id,

    variantId: variant?.id || null,

    purchaseType,

  };

}



export default function PremiumUpgradePanel({

  campaign,

  compact = false,

  initialPlanId = null,

  initialVariantId = null,

  embedded = false,

  onStepChange = null,

  onComplete = null,

}) {

  const { user } = useAuth();

  const { toast } = useToast();

  const [selected, setSelected] = useState(null);

  const [variant, setVariant] = useState(null);

  const [step, setStep] = useState('pick');

  const [payment, setPayment] = useState(null);

  const [loading, setLoading] = useState(false);

  const [proofProgress, setProofProgress] = useState(0);

  const [proofError, setProofError] = useState('');

  const [purchaseError, setPurchaseError] = useState('');

  const autoPurchaseAttempted = useRef(false);



  useEffect(() => {

    if (!initialPlanId) return;

    const plan = getPurchasablePlan(resolvePlanId(initialPlanId));

    if (plan) {

      setSelected(plan);

      if (initialVariantId && plan.variants) {

        const v = plan.variants.find((x) => x.id === initialVariantId);

        if (v) setVariant(v);

      }

    }

  }, [initialPlanId, initialVariantId]);



  useEffect(() => {

    onStepChange?.({ step, payment, selected, variant });

  }, [step, payment, selected, variant, onStepChange]);



  useEffect(() => {

    if (!campaign?.id || !user?.uid || !selected || step !== 'pick') return undefined;



    const meta = getPurchaseMeta(selected, variant);

    if (!meta) return undefined;

    if (selected.variants && !variant) return undefined;



    let cancelled = false;



    getPaymentForPlan({

      campaignId: campaign.id,

      userId: user.uid,

      ...meta,

    }).then((existing) => {

      if (cancelled || !existing) return;

      setPayment(existing);

      if (existing.paymentStatus === 'pending_review' || existing.awaitingReview) {

        setStep('done');

      } else if (existing.paymentStatus === 'pending') {

        setStep('pay');

      }

    }).catch(() => {});



    return () => {

      cancelled = true;

    };

  }, [campaign?.id, user?.uid, selected?.id, variant?.id, step]);



  useEffect(() => {
    if (!initialPlanId || !campaign?.id || !user?.uid) return;
    if (autoPurchaseAttempted.current || loading) return;

    const plan = getPurchasablePlan(resolvePlanId(initialPlanId));
    if (!plan) return;
    if (plan.variants && !initialVariantId) return;

    const alreadyActive = plan.isBundle || plan.isSubscription
      ? plan.includes?.every((id) => hasPremiumFeature(campaign, id))
      : hasPremiumFeature(campaign, plan.id);
    if (alreadyActive) return;

    autoPurchaseAttempted.current = true;

    (async () => {
      setLoading(true);
      setPurchaseError('');
      try {
        const pay = await createPremiumPurchase({
          campaignId: campaign.id,
          userId: user.uid,
          featureId: plan.id,
          variantId: initialVariantId || null,
        });
        setPayment(pay);
        setSelected(plan);
        if (initialVariantId && plan.variants) {
          const v = plan.variants.find((x) => x.id === initialVariantId);
          if (v) setVariant(v);
        }
        if (pay.awaitingReview || pay.paymentStatus === 'pending_review') {
          setStep('done');
          toast('Proof already submitted — awaiting admin review', 'info');
        } else {
          setStep('pay');
          try {
            await navigator.clipboard.writeText(pay.paymentReference);
            toast(`Reference copied — send ₵${pay.amount} via MoMo`, 'success');
          } catch {
            toast('Payment reference generated', 'success');
          }
        }
      } catch (err) {
        autoPurchaseAttempted.current = false;
        const message = err.message || 'Could not start purchase';
        setPurchaseError(message);
        toast(message, 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [initialPlanId, initialVariantId, campaign, user?.uid, loading, toast]);



  if (!campaign?.id) return null;

  const isPlanActive = (plan) => {
    if (plan.purchaseType === 'hosting') {
      return hasPremiumFeature(campaign, plan.id);
    }
    if (plan.isBundle || plan.isSubscription) {
      return plan.includes?.every((id) => hasPremiumFeature(campaign, id));
    }
    return hasPremiumFeature(campaign, plan.id);
  };

  const handlePurchaseForPlan = async (plan = selected) => {
    if (!plan || !user?.uid || !campaign?.id) return;
    if (plan.variants) return;

    setLoading(true);
    setPurchaseError('');
    try {
      const pay = await createPremiumPurchase({
        campaignId: campaign.id,
        userId: user.uid,
        featureId: plan.id,
        variantId: null,
      });
      setPayment(pay);
      setSelected(plan);
      if (pay.awaitingReview || pay.paymentStatus === 'pending_review') {
        setStep('done');
        toast('Proof already submitted — awaiting admin review', 'info');
      } else {
        setStep('pay');
        try {
          await navigator.clipboard.writeText(pay.paymentReference);
          toast(`Reference copied — send ${pay.amount} GHS via MoMo`, 'success');
        } catch {
          toast('Payment reference generated', 'success');
        }
      }
    } catch (err) {
      const message = err.message || 'Could not start purchase';
      setPurchaseError(message);
      toast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (plan) => {
    setSelected(plan);
    setVariant(null);
    setPayment(null);
    setStep('pick');
    setPurchaseError('');
    setProofError('');
    autoPurchaseAttempted.current = false;

    if (embedded && !plan.variants && !isPlanActive(plan)) {
      handlePurchaseForPlan(plan);
    }
  };

  const handlePurchase = async () => {
    if (!selected || !user?.uid) return;
    await handlePurchaseForPlan(selected);
  };

  const resetCheckout = () => {

    setStep('pick');

    setSelected(null);

    setVariant(null);

    setPayment(null);

    setPurchaseError('');

    setProofError('');

  };



  const handleProof = async (file) => {

    if (!user?.uid) {

      toast('You must be signed in to upload payment confirmation.', 'error');

      return;

    }

    if (!payment?.id) {

      toast('Payment session expired — generate a new reference.', 'error');

      resetCheckout();

      return;

    }

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

      toast('Payment confirmation submitted — awaiting admin review', 'success');

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

        <PaymentScreen

          pkg={pkg}

          paymentReference={payment.paymentReference}

          onContinue={embedded ? undefined : () => setStep('proof')}

          step={1}

          embedded={embedded}

          hideContinue={embedded}

        />

        {embedded && (
          <PaymentProofUpload
            onSubmit={handleProof}
            loading={loading}
            uploadProgress={proofProgress}
            uploadError={proofError}
            embedded
            step={2}
          />
        )}

        <button

          type="button"

          onClick={() => {

            setStep('pick');

            setPayment(null);

          }}

          className="btn-secondary w-full text-sm"

        >

          ← Change plan

        </button>

      </div>

    );

  }



  if (step === 'proof') {

    if (!payment?.id) {

      resetCheckout();

      return null;

    }

    return (

      <div className="space-y-4">

        <PaymentProofUpload

          onSubmit={handleProof}

          loading={loading}

          uploadProgress={proofProgress}

          uploadError={proofError}

          embedded={embedded}

          step={2}

        />

        <button type="button" onClick={() => setStep('pay')} className="btn-secondary w-full text-sm">

          ← Back to payment details

        </button>

      </div>

    );

  }



  if (step === 'done') {

    return (

      <div className={`text-center p-6 sm:p-8 ${embedded ? 'rounded-xl border border-emerald-500/20 bg-emerald-500/5' : 'glass-card border-emerald-500/20'}`}>

        <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto mb-4">

          <span className="text-2xl">✓</span>

        </div>

        <p className="text-emerald-400 font-semibold text-lg mb-2">Payment confirmation received</p>

        <p className="text-sm text-gray-500 mb-1">

          Reference: <span className="font-mono text-brand-400">{payment?.paymentReference}</span>

        </p>

        <p className="text-xs text-gray-600 mb-6">Awaiting admin review — you&apos;ll be notified when your purchase is active.</p>

        <button

          type="button"

          onClick={() => {

            resetCheckout();

            onComplete?.();

          }}

          className="btn-primary text-sm px-8"

        >

          Done

        </button>

      </div>

    );

  }



  const plans = [...ALL_PREMIUM_PLANS, ...HOSTING_PACKAGES].filter(
    (p) => p.purchasable && p.id !== PREMIUM_FEATURE_IDS.VISIBILITY_BOOST,
  );

  return (

    <div className={compact ? 'space-y-4' : 'space-y-6'}>

      {!compact && (

        <div>

          <h2 className="text-xl font-bold text-white">Verification & hosting</h2>

          <p className="text-sm text-gray-500 mt-1">

            Extend hosting or add premium presence tools · Pay via Telecel Cash

          </p>

        </div>

      )}



      <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>

        {embedded && loading && (
          <p className="text-sm text-brand-400 text-center col-span-full animate-pulse">Preparing checkout…</p>
        )}

        {plans.filter((p) => p.purchasable).map((plan, i) => {

          const active = isPlanActive(plan);

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

            </motion.div>

          );

        })}

      </div>



      {selected && !isPlanActive(selected) && !embedded && (

        <>

          {purchaseError && (

            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">

              {purchaseError}

            </p>

          )}

          <button

            type="button"

            onClick={handlePurchase}

            disabled={loading || (selected.variants && !variant) || embedded}

            className="btn-primary w-full py-3 disabled:opacity-50"

          >

            {loading ? 'Generating reference…' : selected.button || `Get ${selected.name}`}

          </button>

        </>

      )}

    </div>

  );

}

