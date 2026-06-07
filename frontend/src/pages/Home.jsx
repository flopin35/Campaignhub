import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import HeroSection from '../components/HeroSection';
import FeatureSection from '../components/FeatureSection';
import HowItWorks from '../components/HowItWorks';
import CampaignCard from '../components/CampaignCard';
import CampaignSkeleton from '../components/CampaignSkeleton';
import EmptyState from '../components/EmptyState';
import FeaturedBanner from '../components/FeaturedBanner';
import SpotlightCarousel from '../components/SpotlightCarousel';
import BoostedHero from '../components/BoostedHero';
import { useCampaigns } from '../hooks/useCampaigns';
import { useMemo } from 'react';

export default function Home() {
  const { campaigns: liveCampaigns, loading } = useCampaigns({ status: 'active', sort: 'newest' });

  const featuredCampaign = useMemo(
    () => liveCampaigns.find((c) => c.featured) || liveCampaigns[0] || null,
    [liveCampaigns]
  );

  return (
    <div className="pb-4">
      <HeroSection campaignCount={liveCampaigns.length} />

      {!loading && featuredCampaign && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 mb-4">
          <FeaturedBanner campaign={featuredCampaign} />
        </section>
      )}

      <BoostedHero campaigns={liveCampaigns} loading={loading} />
      <SpotlightCarousel campaigns={liveCampaigns} />

      <FeatureSection />
      <HowItWorks />

      <section className="py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10"
          >
            <div>
              <h2 className="section-title">Live Campaigns</h2>
              <p className="section-subtitle">Real campaigns approved and running on CampaignHub.</p>
            </div>
            <Link to="/campaigns" className="text-sm text-brand-400 hover:text-brand-300 font-medium shrink-0">
              View all →
            </Link>
          </motion.div>

          {loading ? (
            <CampaignSkeleton />
          ) : liveCampaigns.length === 0 ? (
            <EmptyState
              title="No live campaigns yet"
              description="Be the first to launch a campaign on CampaignHub."
              actionLabel="Launch Campaign"
              actionTo="/upload"
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {liveCampaigns.slice(0, 6).map((c, i) => (
                <CampaignCard key={c.id} campaign={c} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
