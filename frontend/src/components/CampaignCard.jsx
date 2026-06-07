import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { formatCountdown, getStatusBadgeClass } from '../utils/helpers';
import { getStatusLabel } from '../utils/campaignHelpers';
import VerificationBadge from './VerificationBadge';
import BoostBadge from './BoostBadge';
import QuickShareModal, { CardShareActions } from './QuickShareModal';
import { Flame } from './icons/AppIcons';

export default function CampaignCard({ campaign, index = 0, showViews = true, showShareActions = true }) {
  const [shareOpen, setShareOpen] = useState(false);
  const image = campaign.bannerImage || campaign.bannerUrl;
  const views = campaign.analytics?.totalViews ?? campaign.views ?? 0;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.08 }}
        whileHover={{ y: -4 }}
        className="card group overflow-hidden p-0 hover:border-brand-500/30 hover:shadow-lg hover:shadow-brand-600/5 flex flex-col"
      >
        <Link to={`/campaign/${campaign.slug}`} className="flex-1">
          <div className="aspect-[16/9] overflow-hidden bg-surface-elevated relative">
            {image ? (
              <img
                src={image}
                alt={campaign.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-600">No image</div>
            )}
            {campaign.viralScore > 0 && (
              <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-brand-600/90 text-white font-medium inline-flex items-center gap-1">
                <Flame className="w-3 h-3" />
                Trending
              </span>
            )}
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between mb-2 gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={getStatusBadgeClass(campaign.status)}>{getStatusLabel(campaign.status)}</span>
                <VerificationBadge verified={campaign.verified} />
                {campaign.paymentVerified && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    Verified Payment
                  </span>
                )}
                <BoostBadge campaign={campaign} showTimer={false} />
                {campaign.featured && <span className="badge-active text-[10px]">featured</span>}
                {campaign.category && <span className="text-[10px] text-gray-500">{campaign.category}</span>}
                {campaign.packageName && <span className="text-[10px] text-brand-400/80">{campaign.packageName}</span>}
              </div>
              {campaign.remainingMs != null && (
                <span className="text-xs text-gray-500 shrink-0">{formatCountdown(campaign.remainingMs)}</span>
              )}
            </div>

            <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-brand-400 transition-colors line-clamp-1">
              {campaign.title}
            </h3>
            {campaign.ownerName && (
              <p className="text-xs text-gray-500 mb-2">by {campaign.ownerName}</p>
            )}
            <p className="text-sm text-gray-400 line-clamp-2">{campaign.description}</p>
            {showViews && (
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-3">
                <span>{views.toLocaleString()} views</span>
                {campaign.shareScore > 0 && (
                  <span>{campaign.shareScore.toLocaleString()} shares</span>
                )}
              </p>
            )}
          </div>
        </Link>

        {showShareActions && campaign.status === 'active' && (
          <div className="px-5 pb-5">
            <CardShareActions campaign={campaign} onShareClick={() => setShareOpen(true)} />
          </div>
        )}
      </motion.div>

      {shareOpen && (
        <QuickShareModal campaign={campaign} onClose={() => setShareOpen(false)} />
      )}
    </>
  );
}
