import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { isBoostActive, sortCampaignsForDisplay } from '../utils/campaignHelpers';
import BoostBadge from './BoostBadge';
import EmptyState from './EmptyState';

export default function BoostedHero({ campaigns, loading }) {
  const boosted = useMemo(
    () => sortCampaignsForDisplay(campaigns.filter((c) => isBoostActive(c))),
    [campaigns]
  );
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (boosted.length <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % boosted.length), 5000);
    return () => clearInterval(timer);
  }, [boosted.length]);

  if (loading) {
    return (
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="aspect-[21/9] rounded-2xl bg-surface-elevated animate-pulse" />
        </div>
      </section>
    );
  }

  if (boosted.length === 0) {
    return (
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-title mb-4">Active Boosts</h2>
          <EmptyState
            title="No active boosts"
            description="Boosted campaigns appear here with priority placement on the homepage."
            actionLabel="Explore Campaigns"
            actionTo="/campaigns"
          />
        </div>
      </section>
    );
  }

  const current = boosted[index];
  const image = current.bannerImage || current.bannerUrl;

  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="section-title">Active Boosts</h2>
            <p className="section-subtitle">Priority campaigns with live boost timers.</p>
          </div>
          {boosted.length > 1 && (
            <div className="flex gap-1.5 shrink-0">
              {boosted.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Boost slide ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${i === index ? 'bg-amber-400' : 'bg-surface-border'}`}
                />
              ))}
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="relative rounded-2xl overflow-hidden border border-amber-500/25 group"
          >
            <div className="aspect-[16/9] sm:aspect-[21/9] bg-surface-elevated">
              {image && (
                <img
                  src={image}
                  alt={current.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <BoostBadge campaign={current} className="mb-3" />
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">{current.title}</h3>
              {current.ownerName && <p className="text-brand-400 text-sm mb-2">by {current.ownerName}</p>}
              <p className="text-gray-300 text-sm max-w-xl mb-4 line-clamp-2">{current.description}</p>
              <div className="flex flex-wrap items-center gap-3">
                <Link to={`/campaign/${current.slug}`} className="btn-primary text-sm">
                  View Campaign
                </Link>
                <span className="text-sm text-gray-500">{(current.views || 0).toLocaleString()} views</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
