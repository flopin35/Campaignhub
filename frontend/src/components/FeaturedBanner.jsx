import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { formatCountdown } from '../utils/helpers';
import BoostBadge from './BoostBadge';

export default function FeaturedBanner({ campaign }) {
  if (!campaign) return null;
  const image = campaign.bannerImage || campaign.bannerUrl;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative rounded-2xl overflow-hidden border border-surface-border group"
    >
      <div className="aspect-[21/9] sm:aspect-[21/8] bg-surface-elevated">
        {image && (
          <img src={image} alt={campaign.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
        <span className="badge-active mb-3">Featured</span>
        <BoostBadge campaign={campaign} className="mb-2 mr-2" />
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{campaign.title}</h2>
        {campaign.ownerName && <p className="text-brand-400 text-sm mb-2">by {campaign.ownerName}</p>}
        <p className="text-gray-300 text-sm sm:text-base max-w-xl mb-4 line-clamp-2">{campaign.description}</p>
        <div className="flex items-center gap-4 flex-wrap">
          <Link to={`/campaign/${campaign.slug}`} className="btn-primary text-sm">View Campaign</Link>
          {campaign.remainingMs != null && (
            <span className="text-sm text-gray-400">{formatCountdown(campaign.remainingMs)}</span>
          )}
          <span className="text-sm text-gray-500">{campaign.views || 0} views</span>
        </div>
      </div>
    </motion.div>
  );
}
