import { useState } from 'react';

import { Link } from 'react-router-dom';

import { CheckCircle2 } from '../components/icons/AppIcons';

import { motion } from 'framer-motion';

import UploadForm from '../components/UploadForm';

import CopyLinkButton from '../components/CopyLinkButton';

import UploadProgressBar from '../components/UploadProgressBar';

import { useAuth } from '../context/AuthContext';

import { useToast } from '../context/ToastContext';

import { createCampaign } from '../services/campaignFirestoreService';

import { getCampaignUrl } from '../utils/helpers';

import { PACKAGES } from '../data/packages';

import { createNotification } from '../services/notificationService';

import { BRAND_COPY } from '../data/brand';



const FREE_PKG = PACKAGES[0];



export default function UploadCampaign() {

  const { user, userProfile } = useAuth();

  const { toast } = useToast();

  const [loading, setLoading] = useState(false);

  const [uploadProgress, setUploadProgress] = useState(0);

  const [uploadLabel, setUploadLabel] = useState('');

  const [error, setError] = useState('');

  const [done, setDone] = useState(null);



  const handleLaunch = async (data) => {

    if (!data?.form || !data?.bannerFile) {

      toast('Please fill in all required fields', 'warning');

      return;

    }

    if (!user?.uid) {

      toast('You must be signed in to launch a campaign page', 'error');

      return;

    }



    setLoading(true);

    setError('');

    setUploadProgress(0);

    setUploadLabel('Starting upload…');



    try {

      const created = await createCampaign({

        form: data.form,

        bannerFile: data.bannerFile,

        logoFile: data.logoFile,

        galleryFiles: data.galleryFiles || [],

        ownerId: user.uid,

        ownerName: userProfile?.name || user.displayName || 'Campaign Owner',

        ownerEmail: user.email,

        pkg: FREE_PKG,

        onUploadProgress: (pct, label) => {

          setUploadProgress(pct);

          if (label) setUploadLabel(label);

        },

      });



      setUploadProgress(100);

      setUploadLabel('Upload complete');



      try {

        await createNotification({

          userId: user.uid,

          message: 'Your campaign page is now live on CampaignHub!',

          type: 'campaign_approved',

          campaignId: created.id,

        });

      } catch {

        /* optional */

      }



      const url = getCampaignUrl(created.slug);

      try {

        await navigator.clipboard.writeText(url);

        toast('Campaign page live! Link copied to clipboard.', 'success');

      } catch {

        toast('Campaign page launched! It is live on the public site.', 'success');

      }

      setDone({ ...created, free: true, live: true });

    } catch (err) {

      const msg = err.message || 'Failed to create campaign page';

      setError(msg);

      toast(msg, 'error');

      console.error('Create campaign error:', err);

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

          <h2 className="text-2xl font-bold text-white mb-2">{BRAND_COPY.successTitle}</h2>

          <p className="text-sm text-gray-500 mb-6">

            {BRAND_COPY.successSubtext}

          </p>

          <div className="bg-surface-elevated rounded-xl p-4 mb-6">

            <p className="text-xs text-gray-500 mb-1">Official campaign link</p>

            <p className="text-sm text-brand-400 break-all">{url}</p>

          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">

            <Link to={`/campaign/${done.slug}`} className="btn-primary text-sm">View Campaign Page</Link>

            <CopyLinkButton url={url} campaignId={done.id} />

            <Link to="/dashboard" className="btn-secondary text-sm">My Campaign Pages</Link>

          </div>

        </motion.div>

      </div>

    );

  }



  return (

    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">

        <h1 className="text-3xl font-bold text-white mb-2">{BRAND_COPY.uploadTitle}</h1>

        <p className="text-gray-500 text-sm">{BRAND_COPY.uploadSubtitle}</p>

      </motion.div>



      {error && (

        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>

      )}



      <UploadForm onComplete={handleLaunch} defaultEmail={user?.email || ''} launching={loading} />



      {loading && (

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 space-y-4 mt-6">

          <div className="flex items-center gap-3">

            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin shrink-0" />

            <p className="text-brand-400 text-sm">{uploadLabel || 'Uploading…'}</p>

          </div>

          <UploadProgressBar progress={uploadProgress} label={uploadLabel} status="uploading" />

        </motion.div>

      )}

    </div>

  );

}


