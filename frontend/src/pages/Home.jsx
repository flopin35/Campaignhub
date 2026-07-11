import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import HeroSection from '../components/HeroSection';
import FeatureSection from '../components/FeatureSection';
import HowItWorks from '../components/HowItWorks';
import TrustSection from '../components/TrustSection';
import PremiumFeaturesSection from '../components/PremiumFeaturesSection';
import CampaignCard from '../components/CampaignCard';
import CampaignSkeleton from '../components/CampaignSkeleton';
import EmptyState from '../components/EmptyState';
import FeaturedBanner from '../components/FeaturedBanner';
import { useCampaigns } from '../hooks/useCampaigns';
import { useMemo } from 'react';
import { BRAND_COPY } from '../data/brand';

export default function Home() {
  const { campaigns: liveCampaigns, loading } = useCampaigns({ status: 'active', sort: 'newest' });

  const featuredCampaign = useMemo(
    () => liveCampaigns.find((c) => c.verified && c.featured) || liveCampaigns.find((c) => c.verified) || null,
    [liveCampaigns]
  );

  return (
    <div className="pb-4">
      <HeroSection campaignCount={liveCampaigns.length} />
      <FeatureSection />
      <HowItWorks />
      <TrustSection />
      <PremiumFeaturesSection />

      {!loading && featuredCampaign && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <h2 className="section-title mb-2">Official pages in the directory</h2>
          <p className="section-subtitle mb-8">Admin-authorized campaign pages citizens can trust.</p>
          <FeaturedBanner campaign={featuredCampaign} />
        </section>
      )}

      <section className="py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10"
          >
            <div>
              <h2 className="section-title">Campaign Directory</h2>
              <p className="section-subtitle">Official political campaign pages across Ghana.</p>
            </div>
            <Link to="/campaigns" className="text-sm text-brand-400 hover:text-brand-300 font-medium shrink-0">
              Browse all →
            </Link>
          </motion.div>

          {loading ? (
            <CampaignSkeleton />
          ) : liveCampaigns.length === 0 ? (
            <EmptyState
              title="No campaign pages yet"
              description="Be the first to launch an official political campaign page on CampaignHub."
              actionLabel={BRAND_COPY.launchCta}
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
