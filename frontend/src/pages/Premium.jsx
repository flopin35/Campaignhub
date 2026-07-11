import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FREE_PLAN,
  SUBSCRIPTION_PACKAGE,
  PREMIUM_PACKAGES,
  PREMIUM_INCLUDED_FEATURES,
  HOSTING_PACKAGES,
  PREMIUM_FEATURE_IDS,
} from '../data/premiumPackages';
import PremiumPackageCard from '../components/PremiumPackageCard';
import AdBoostPricing from '../components/AdBoostPricing';
import WhyUpgradeSection from '../components/WhyUpgradeSection';
import TrustPaymentBlock from '../components/TrustPaymentBlock';
import { usePremiumModal } from '../context/PremiumModalContext';
import { useMyCampaignsPremium } from '../hooks/useMyCampaignsPremium';
import PremiumActiveBadge from '../components/PremiumActiveBadge';

const spotlightPlan = PREMIUM_PACKAGES[0];

export default function Premium() {
  const { openPremiumModal, openAdBoostModal } = usePremiumModal();
  const { hasAnyPremium, primaryPremiumCampaign } = useMyCampaignsPremium();

  const openSubscription = () => openPremiumModal({ planId: PREMIUM_FEATURE_IDS.PREMIUM_SUBSCRIPTION });
  const openSpotlight = (variantId = null) => openAdBoostModal({ variantId });

  return (
    <div className="pb-20 md:pb-16">
      <section className="relative overflow-hidden py-14 sm:py-20 border-b border-surface-border">
        <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-400 mb-3">Verification & hosting</p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight mb-3">
              Stay official. Stay findable.
            </h1>
            <p className="text-gray-400 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
              {hasAnyPremium
                ? 'Your CampaignHub Premium subscription is active — directory spotlight and hosting extensions are below.'
                : 'CampaignHub Premium — ₵500/month for authorization review, extended official presence, and directory visibility. Directory spotlight sold separately. The Official Page badge always requires admin review.'}
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-14 sm:space-y-16">
        {hasAnyPremium && primaryPremiumCampaign && (
          <section className="page-section">
            <PremiumActiveBadge campaign={primaryPremiumCampaign} variant="banner" />
            <p className="text-sm text-gray-500 mt-4 text-center max-w-xl mx-auto">
              Your ₵500/month subscription is active. Directory spotlight and extended hosting remain available below.
            </p>
          </section>
        )}

        {!hasAnyPremium && <WhyUpgradeSection />}

        <section className="page-section">
          <h2 className="section-title mb-2">Start with an official page</h2>
          <p className="section-subtitle mb-6">Launch free — your message, link, and QR code.</p>
          <div className="max-w-md">
            <PremiumPackageCard
              plan={{ ...FREE_PLAN, button: 'Launch Campaign Page' }}
              showConversion={false}
              showButton={false}
            />
            <Link to="/upload" className="btn-primary w-full mt-4 py-3 min-h-[48px] text-center block">
              Launch Campaign Page
            </Link>
          </div>
        </section>

        {!hasAnyPremium && (
          <section className="page-section">
            <h2 className="section-title mb-2">CampaignHub Premium</h2>
            <p className="section-subtitle mb-6">
              Official presence in one ₵500 subscription — authorization review path, hosting, and directory visibility. One payment, one reference.
            </p>
            <div className="max-w-xl mx-auto">
              <PremiumPackageCard plan={SUBSCRIPTION_PACKAGE} onCardClick={openSubscription} showButton={false} showConversion={false} />
            </div>
          </section>
        )}

        {!hasAnyPremium && (
          <section className="page-section">
            <h2 className="section-title mb-2">What Premium covers</h2>
            <p className="section-subtitle mb-6">Presence pillars included in the subscription.</p>
            <div className="grid sm:grid-cols-3 gap-4">
              {PREMIUM_INCLUDED_FEATURES.map((plan, i) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                >
                  <PremiumPackageCard
                    plan={{ ...plan, button: 'Included in Premium' }}
                    compact
                    showConversion={false}
                    showButton={false}
                    onCardClick={openSubscription}
                  />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        <section className="page-section">
          <h2 className="section-title mb-2">Directory Spotlight</h2>
          <p className="section-subtitle mb-6">
            Homepage and directory placement — separate from Premium. Choose a duration below.
          </p>
          <div className="max-w-4xl mx-auto glass-card border-amber-500/15">
            <AdBoostPricing onSelect={(pkg) => openSpotlight(pkg.id)} />
            <div className="mt-5 pt-4 border-t border-surface-border flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <ul className="grid sm:grid-cols-2 gap-2 flex-1">
                {spotlightPlan.features.map((f) => (
                  <li key={f} className="text-xs text-gray-400 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => openSpotlight()}
                className="btn-primary shrink-0 border-amber-500/30 bg-amber-600/25 hover:bg-amber-600/35"
              >
                Spotlight campaign page
              </button>
            </div>
          </div>
        </section>

        <section className="page-section">
          <h2 className="section-title mb-2">Extended hosting</h2>
          <p className="section-subtitle mb-6">Keep your official campaign page live longer — ₵500 per extension.</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {HOSTING_PACKAGES.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
              >
                <PremiumPackageCard
                  plan={{ ...plan, button: 'Extend hosting' }}
                  compact
                  showConversion={false}
                  showButton={false}
                  onCardClick={() => openPremiumModal({ planId: plan.id })}
                />
              </motion.div>
            ))}
          </div>
        </section>

        <TrustPaymentBlock />
      </div>
    </div>
  );
}
