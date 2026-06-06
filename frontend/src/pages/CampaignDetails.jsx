import { useEffect, useState } from 'react';
import { useParams, Link, Navigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCampaign } from '../hooks/useCampaigns';
import { useAuth } from '../context/AuthContext';
import CampaignSkeleton from '../components/CampaignSkeleton';
import ShareCampaignSection from '../components/ShareCampaignSection';
import VerificationBadge from '../components/VerificationBadge';
import CampaignCountdown from '../components/CampaignCountdown';
import FollowButton from '../components/FollowButton';
import CommentsSection from '../components/CommentsSection';
import ExtendCampaignModal, { ExtendCampaignBanner } from '../components/ExtendCampaignModal';
import ReportButton from '../components/ReportButton';
import { trackVisit } from '../services/analyticsService';
import { getReferralSource } from '../utils/sharing';
import { BarChart3, CheckCircle2 } from '../components/icons/AppIcons';
import { formatDate, getStatusBadgeClass } from '../utils/helpers';
import { createNotification } from '../services/notificationService';
import { shouldShowExpiryWarning } from '../services/extensionService';

export default function CampaignDetails() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { campaign, loading, error } = useCampaign(slug);
  const [viewTracked, setViewTracked] = useState(false);
  const [showExtend, setShowExtend] = useState(false);
  const [expiryNotified, setExpiryNotified] = useState(false);

  useEffect(() => {
    if (campaign?.id && campaign.status === 'active' && !viewTracked) {
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
      !expiryNotified
    ) {
      createNotification({
        userId: user.uid,
        message: `Campaign "${campaign.title}" expires in ${Math.ceil(campaign.remainingMs / 86400000)} days`,
        type: 'campaign_expiring',
        campaignId: campaign.id,
      }).catch(() => {});
      setExpiryNotified(true);
    }
  }, [campaign, user, expiryNotified]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20">
        <CampaignSkeleton count={1} />
      </div>
    );
  }

  if (error || !campaign || campaign.status !== 'active' || campaign.isExpired) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Campaign Not Found</h2>
        <p className="text-gray-400 mb-6">This campaign may be pending, expired, or doesn't exist.</p>
        <Link to="/campaigns" className="btn-primary">Browse Campaigns</Link>
      </div>
    );
  }

  const isOwner = user?.uid === campaign.ownerId;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="rounded-2xl overflow-hidden border border-surface-border mb-8 relative">
          <img src={campaign.bannerImage} alt={campaign.title} className="w-full aspect-[21/9] object-cover" loading="lazy" />
          {campaign.logoUrl && (
            <div className="absolute bottom-4 left-4 w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-2 border-white/20 bg-surface-card overflow-hidden shadow-lg">
              <img src={campaign.logoUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {isOwner && <ExtendCampaignBanner campaign={campaign} onExtend={() => setShowExtend(true)} />}

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className={getStatusBadgeClass(campaign.status)}>{campaign.status}</span>
          <VerificationBadge verified={campaign.verified} />
          {campaign.campaignType && <span className="badge-pending">{campaign.campaignType}</span>}
          {campaign.packageName && <span className="text-xs text-gray-500">{campaign.packageName}</span>}
          {campaign.featured && <span className="badge-active">Featured</span>}
          {campaign.spotlight && <span className="badge-pending">Spotlight</span>}
          <CampaignCountdown remainingMs={campaign.remainingMs} endDate={campaign.endDate} />
          <span className="text-sm text-gray-500">{campaign.views || 0} views</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">{campaign.title}</h1>
        {campaign.ownerName && (
          <p className="text-brand-400 text-sm mb-4">by {campaign.ownerName}</p>
        )}
        <p className="text-gray-400 text-lg leading-relaxed mb-6">{campaign.description}</p>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <FollowButton campaign={campaign} />
          <div className="flex items-center gap-2">
            {isOwner && (
              <Link to={`/campaign/${slug}/performance`} className="btn-secondary text-sm py-2 px-4 inline-flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Performance
              </Link>
            )}
            <ReportButton type="campaign" targetId={campaign.id} />
          </div>
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
              <h3 className="text-sm font-medium text-gray-500 mb-3">Social Links</h3>
              <div className="space-y-2 text-sm">
                {campaign.socialLinks.website && (
                  <a href={campaign.socialLinks.website} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline block truncate">Website</a>
                )}
                {campaign.socialLinks.facebook && (
                  <a href={campaign.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline block truncate">Facebook</a>
                )}
                {campaign.socialLinks.twitter && (
                  <a href={campaign.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline block truncate">X / Twitter</a>
                )}
                {campaign.socialLinks.instagram && (
                  <a href={campaign.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline block truncate">Instagram</a>
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
        <CommentsSection campaignId={campaign.id} />
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
