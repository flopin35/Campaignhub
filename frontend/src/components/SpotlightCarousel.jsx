import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCountdown } from '../utils/helpers';
import BoostBadge from './BoostBadge';
import EmptyState from './EmptyState';

export default function SpotlightCarousel({ campaigns }) {
  const spotlight = campaigns.filter((c) => c.spotlight && c.status === 'active');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (spotlight.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % spotlight.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [spotlight.length]);

  if (spotlight.length === 0) {
    return (
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white mb-4">Elite Spotlight</h2>
          <EmptyState
            title="No spotlight campaigns"
            description="Elite package campaigns with spotlight placement appear here."
            actionLabel="View all campaigns"
            actionTo="/campaigns"
          />
        </div>
      </section>
    );
  }

  const current = spotlight[index];

  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Elite Spotlight</h2>
          <div className="flex gap-1.5">
            {spotlight.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === index ? 'bg-brand-500' : 'bg-surface-border'}`}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="relative rounded-2xl overflow-hidden border border-brand-500/20 glass-card p-0"
          >
            <div className="grid lg:grid-cols-2">
              <div className="aspect-[16/10] lg:aspect-auto">
                <img src={current.bannerImage} alt={current.title} className="w-full h-full object-cover min-h-[240px]" />
              </div>
              <div className="p-8 flex flex-col justify-center">
                <span className="badge-active w-fit mb-3">Elite · Spotlight</span>
                <BoostBadge campaign={current} className="mb-2" />
                <h3 className="text-2xl font-bold text-white mb-2">{current.title}</h3>
                <p className="text-gray-400 text-sm mb-4 line-clamp-3">{current.description}</p>
                {current.remainingMs != null && (
                  <p className="text-sm text-brand-400 mb-4">{formatCountdown(current.remainingMs)}</p>
                )}
                <Link to={`/campaign/${current.slug}`} className="btn-primary w-fit text-sm">
                  View Campaign
                </Link>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
