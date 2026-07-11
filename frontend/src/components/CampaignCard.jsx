import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getStatusBadgeClass } from '../utils/helpers';
import { getStatusLabel } from '../utils/campaignHelpers';
import VerificationBadge from './VerificationBadge';
import QuickShareModal, { CardShareActions } from './QuickShareModal';

/** Public directory card — only Official Page badge as trust mark. */
export default function CampaignCard({ campaign, index = 0, showViews = false, showShareActions = true }) {
  const [shareOpen, setShareOpen] = useState(false);
  const image = campaign.bannerImage || campaign.bannerUrl;
  const views = campaign.analytics?.totalViews ?? campaign.views ?? 0;
  const office = campaign.campaignType;

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
          </div>

          <div className="p-5">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {campaign.status === 'active' && !campaign.isExpired ? null : (
                <span className={getStatusBadgeClass(campaign.status)}>{getStatusLabel(campaign.status)}</span>
              )}
              <VerificationBadge verified={campaign.verified} />
              {office && <span className="text-[10px] text-gray-500">{office}</span>}
            </div>

            <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-brand-400 transition-colors line-clamp-1">
              {campaign.title}
            </h3>
            {campaign.ownerName && (
              <p className="text-xs text-gray-500 mb-2">Candidate: {campaign.ownerName}</p>
            )}
            <p className="text-sm text-gray-400 line-clamp-2">{campaign.description}</p>
            {showViews && (
              <p className="text-xs text-gray-500 mt-2">{views.toLocaleString()} views</p>
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
