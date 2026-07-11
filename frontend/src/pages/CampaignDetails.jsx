import { useEffect, useState } from 'react';
import { useParams, Link, Navigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCampaign } from '../hooks/useCampaigns';
import { useAuth } from '../context/AuthContext';
import CampaignSkeleton from '../components/CampaignSkeleton';
import ShareCampaignSection from '../components/ShareCampaignSection';
import VerificationBadge from '../components/VerificationBadge';
import CampaignCountdown from '../components/CampaignCountdown';
import ExtendCampaignModal, { ExtendCampaignBanner } from '../components/ExtendCampaignModal';
import ReportButton from '../components/ReportButton';
import { trackVisit } from '../services/analyticsService';
import { getReferralSource } from '../utils/sharing';
import { LayoutDashboard } from 'lucide-react';
import { formatDate, getStatusBadgeClass } from '../utils/helpers';
import { getStatusLabel, normalizeExternalUrl } from '../utils/campaignHelpers';
import { createNotification } from '../services/notificationService';
import { shouldShowExpiryWarning, recordExpiryWarning } from '../services/extensionService';

export default function CampaignDetails() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { campaign, loading, error } = useCampaign(slug, { ownerId: user?.uid });
  const [viewTracked, setViewTracked] = useState(false);
  const [showExtend, setShowExtend] = useState(false);

  useEffect(() => {
    if (
      campaign?.id
      && campaign.status === 'active'
      && !campaign.isExpired
      && !campaign.disabled
      && !viewTracked
    ) {
      const referral = getReferralSource(searchParams);
      trackVisit(campaign.id, referral).catch(console.error);
      setViewTracked(true);
    }
  }, [campaign, viewTracked, searchParams]);

  useEffect(() => {
    if (
      campaign?.ownerId &&
      user?.uid === campaign.ownerId &&
      shouldShowExpiryWarning(campaign) &&
      !campaign.expiryWarningSentAt
    ) {
      createNotification({
        userId: user.uid,
        message: `Your campaign page "${campaign.title}" expires in ${Math.ceil(campaign.remainingMs / 86400000)} days`,
        type: 'campaign_expiring',
        campaignId: campaign.id,
      })
        .then(() => recordExpiryWarning(campaign.id))
        .catch(() => {});
    }
  }, [campaign, user]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20">
        <CampaignSkeleton count={1} />
      </div>
    );
  }

  const isOwner = user?.uid === campaign?.ownerId;
  const isPublicVisible = campaign
    && campaign.status === 'active'
    && !campaign.isExpired
    && !campaign.disabled;

  if (error || !campaign) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Campaign page not found</h2>
        <p className="text-gray-400 mb-6">This official campaign page may be hidden, archived, or not yet published.</p>
        <Link to="/campaigns" className="btn-primary">Campaign Directory</Link>
      </div>
    );
  }

  if (!isPublicVisible && !isOwner) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Campaign page not found</h2>
        <p className="text-gray-400 mb-6">This official campaign page may be hidden, archived, or not yet published.</p>
        <Link to="/campaigns" className="btn-primary">Campaign Directory</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="rounded-2xl overflow-hidden border border-surface-border mb-8 relative">
          <img src={campaign.bannerImage} alt={campaign.title} className="w-full aspect-[21/9] object-cover" loading="lazy" />
          {campaign.logoUrl && (
            <div className="absolute bottom-4 left-4 w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-2 border-white/20 bg-surface-card overflow-hidden shadow-lg">
              <img src={campaign.logoUrl} alt="Party logo" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {isOwner && !isPublicVisible && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
            Owner preview — this page is not publicly visible
            {campaign.status === 'disabled' || campaign.disabled ? ' (hidden from directory)' : ''}
            {campaign.status === 'payment_pending' ? ' (awaiting payment)' : ''}
            {campaign.status === 'pending_review' ? ' (awaiting admin review)' : ''}
            {campaign.isExpired ? ' (expired)' : ''}.
          </div>
        )}

        {isOwner && <ExtendCampaignBanner campaign={campaign} onExtend={() => setShowExtend(true)} />}

        <div className="flex flex-wrap items-center gap-3 mb-4">
          {isOwner && (
            <span className={getStatusBadgeClass(campaign.status)}>{getStatusLabel(campaign.status)}</span>
          )}
          <VerificationBadge verified={campaign.verified} />
          {isOwner && campaign.verificationRequested && !campaign.verified && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20">
              Authorization pending
            </span>
          )}
          {isOwner && campaign.paymentVerified && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              Payment confirmed
            </span>
          )}
          {campaign.campaignType && <span className="text-xs text-gray-500">{campaign.campaignType}</span>}
          {isOwner && <CampaignCountdown remainingMs={campaign.remainingMs} endDate={campaign.endDate} />}
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{campaign.title}</h1>
        {campaign.ownerName && (
          <p className="text-brand-400 text-sm mb-4">Candidate: {campaign.ownerName}</p>
        )}

        <div className="mb-8">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Campaign Message</h2>
          <p className="text-gray-400 text-lg leading-relaxed">{campaign.description}</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2 mb-8">
          {isOwner && (
            <Link to={`/dashboard?campaign=${slug}`} className="btn-primary text-sm py-2.5 px-4 inline-flex items-center justify-center gap-2 w-full sm:w-auto">
              <LayoutDashboard className="w-4 h-4" />
              Manage Campaign Page
            </Link>
          )}
          <ReportButton type="campaign" targetId={campaign.id} />
        </div>

        {campaign.galleryImages?.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Gallery</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {campaign.galleryImages.map((img, i) => (
                <img key={i} src={img} alt="" className="rounded-xl aspect-square object-cover border border-surface-border" />
              ))}
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-6 mb-8">
          {(campaign.contactEmail || campaign.contactPhone) && (
            <div className="card">
              <h3 className="text-sm font-medium text-gray-500 mb-3">Contact</h3>
              {campaign.contactEmail && <p className="text-gray-300">{campaign.contactEmail}</p>}
              {campaign.contactPhone && <p className="text-gray-300 mt-1">{campaign.contactPhone}</p>}
            </div>
          )}
          {campaign.socialLinks && Object.values(campaign.socialLinks).some(Boolean) && (
            <div className="card">
              <h3 className="text-sm font-medium text-gray-500 mb-3">Official Links</h3>
              <div className="space-y-2 text-sm">
                {campaign.socialLinks.website && (
                  <a href={normalizeExternalUrl(campaign.socialLinks.website)} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline block truncate">Website</a>
                )}
                {campaign.socialLinks.facebook && (
                  <a href={normalizeExternalUrl(campaign.socialLinks.facebook)} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline block truncate">Facebook</a>
                )}
                {campaign.socialLinks.twitter && (
                  <a href={normalizeExternalUrl(campaign.socialLinks.twitter)} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline block truncate">X / Twitter</a>
                )}
                {campaign.socialLinks.instagram && (
                  <a href={normalizeExternalUrl(campaign.socialLinks.instagram)} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline block truncate">Instagram</a>
                )}
              </div>
            </div>
          )}
          <div className="card">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Duration</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Period</span><span className="text-gray-300">{campaign.durationDays} days</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Started</span><span className="text-gray-300">{formatDate(campaign.startDate)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Ends</span><span className="text-gray-300">{formatDate(campaign.endDate)}</span></div>
            </div>
          </div>
        </div>

        <ShareCampaignSection campaign={campaign} />
      </motion.div>

      {showExtend && (
        <ExtendCampaignModal campaign={campaign} onClose={() => setShowExtend(false)} />
      )}
    </div>
  );
}

export function LegacyCampaignRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/campaign/${slug}`} replace />;
}
