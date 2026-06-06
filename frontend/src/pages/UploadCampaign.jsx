import { useState } from 'react';

import { Link } from 'react-router-dom';

import { CheckCircle2 } from '../components/icons/AppIcons';
import { motion } from 'framer-motion';

import UploadForm from '../components/UploadForm';

import PackageSelector from '../components/PackageSelector';

import PaymentScreen from '../components/PaymentScreen';

import PaymentProofUpload from '../components/PaymentProofUpload';

import CopyLinkButton from '../components/CopyLinkButton';

import UploadProgressBar from '../components/UploadProgressBar';

import { useAuth } from '../context/AuthContext';

import { useToast } from '../context/ToastContext';

import { createCampaign } from '../services/campaignFirestoreService';

import { createPayment, submitPaymentProof } from '../services/paymentService';

import { getCampaignUrl } from '../utils/helpers';



const STEPS = ['Details', 'Package', 'Payment', 'Proof'];



export default function UploadCampaign() {

  const { user, userProfile } = useAuth();

  const { toast } = useToast();

  const [step, setStep] = useState(0);

  const [draft, setDraft] = useState(null);

  const [selectedPkg, setSelectedPkg] = useState(null);

  const [campaign, setCampaign] = useState(null);

  const [payment, setPayment] = useState(null);

  const [loading, setLoading] = useState(false);

  const [uploadProgress, setUploadProgress] = useState(0);

  const [uploadLabel, setUploadLabel] = useState('');

  const [proofProgress, setProofProgress] = useState(0);

  const [proofError, setProofError] = useState('');

  const [error, setError] = useState('');

  const [done, setDone] = useState(null);



  const handleFormComplete = (data) => {

    setDraft(data);

    setError('');

    setStep(1);

    toast('Details saved — choose your package', 'success');

  };



  const handlePackageSelect = async (pkg) => {

    if (!draft?.form || !draft?.bannerFile) {

      toast('Campaign details missing — go back and fill the form', 'error');

      setStep(0);

      return;

    }

    if (!user?.uid) {

      toast('You must be signed in to create a campaign', 'error');

      return;

    }



    setSelectedPkg(pkg);

    setLoading(true);

    setError('');

    setUploadProgress(0);

    setUploadLabel('Starting upload…');



    try {

      const created = await createCampaign({

        form: draft.form,

        bannerFile: draft.bannerFile,
        logoFile: draft.logoFile,
        galleryFiles: draft.galleryFiles || [],
        ownerId: user.uid,
        ownerName: userProfile?.name || user.displayName || 'Campaign Owner',
        ownerEmail: user.email,
        pkg,

        onUploadProgress: (pct, label) => {

          setUploadProgress(pct);

          if (label) setUploadLabel(label);

        },

      });



      setUploadProgress(100);

      setUploadLabel('Upload complete');



      const pay = await createPayment({ campaignId: created.id, userId: user.uid, pkg });



      setCampaign(created);

      setPayment(pay);

      setStep(2);

      toast('Campaign created! Complete payment to continue.', 'success');

    } catch (err) {

      const msg = err.message || 'Failed to create campaign';

      setError(msg);

      toast(msg, 'error');

      console.error('Create campaign error:', err);

    } finally {

      setLoading(false);

    }

  };



  const handleProofSubmit = async (file) => {

    if (!payment?.id || !campaign?.id) {

      toast('Payment session expired — please start again', 'error');

      return;

    }



    setLoading(true);

    setError('');

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

      setProofProgress(100);

      toast('Payment proof submitted! Awaiting admin verification.', 'success');

      setDone({ ...campaign, paymentReference: payment.paymentReference });

    } catch (err) {

      const msg = err.message || 'Failed to upload payment proof';

      setProofError(msg);

      setError(msg);

      toast(msg, 'error');

      console.error('Proof upload error:', err);

    } finally {

      setLoading(false);

    }

  };



  if (done) {

    const url = getCampaignUrl(done.slug);

    return (

      <div className="max-w-2xl mx-auto px-4 py-16">

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card text-center">

          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">Payment Pending Review</h2>

          <p className="text-gray-400 mb-2">Reference: <strong className="text-brand-400">{done.paymentReference}</strong></p>

          <p className="text-sm text-gray-500 mb-6">Your campaign goes live after admin verifies payment.</p>

          <div className="bg-surface-elevated rounded-xl p-4 mb-6">

            <p className="text-xs text-gray-500 mb-1">Future public link</p>

            <p className="text-sm text-brand-400 break-all">{url}</p>

          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">

            <CopyLinkButton url={url} campaignId={done.id} />

            <Link to="/dashboard" className="btn-secondary">Dashboard</Link>

          </div>

        </motion.div>

      </div>

    );

  }



  return (

    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">

        <h1 className="text-3xl font-bold text-white mb-2">Launch Campaign</h1>

        <div className="flex gap-2 mt-4">

          {STEPS.map((s, i) => (

            <div key={s} className={`flex-1 h-1 rounded-full ${i <= step ? 'bg-brand-500' : 'bg-surface-border'}`} />

          ))}

        </div>

        <p className="text-gray-500 text-sm mt-2">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>

      </motion.div>



      {error && step !== 3 && (

        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">

          {error}

        </div>

      )}



      {step === 0 && <UploadForm onComplete={handleFormComplete} defaultEmail={user?.email || ''} />}



      {step === 1 && (

        <div className="space-y-6">

          <h2 className="text-lg font-semibold text-white">Select Your Package</h2>

          {!draft?.bannerFile && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
              Banner image missing — go back and upload a banner before continuing.
            </div>
          )}

          <PackageSelector selected={selectedPkg} onSelect={handlePackageSelect} loading={loading} />



          {loading && (

            <motion.div

              initial={{ opacity: 0, y: 8 }}

              animate={{ opacity: 1, y: 0 }}

              className="glass-card p-5 space-y-4"

            >

              <div className="flex items-center gap-3">

                <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin shrink-0" />

                <p className="text-brand-400 text-sm">{uploadLabel || 'Uploading to Firebase Storage…'}</p>

              </div>

              <UploadProgressBar progress={uploadProgress} label={uploadLabel} status="uploading" />

            </motion.div>

          )}



          <button type="button" onClick={() => setStep(0)} disabled={loading} className="btn-secondary w-full disabled:opacity-50">← Back</button>

        </div>

      )}



      {step === 2 && payment && selectedPkg && (

        <div className="space-y-6">

          <PaymentScreen

            pkg={selectedPkg}

            paymentReference={payment.paymentReference}

            onContinue={() => setStep(3)}

          />

        </div>

      )}



      {step === 3 && (

        <PaymentProofUpload

          onSubmit={handleProofSubmit}

          loading={loading}

          uploadProgress={proofProgress}

          uploadError={proofError}

        />

      )}

    </div>

  );

}

