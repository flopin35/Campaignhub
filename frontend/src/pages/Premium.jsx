import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FREE_PLAN,
  PREMIUM_PACKAGES,
  BUNDLE_PACKAGES,
  HOSTING_PACKAGES,
} from '../data/premiumPackages';
import PremiumPackageCard from '../components/PremiumPackageCard';
import WhyUpgradeSection from '../components/WhyUpgradeSection';
import TrustPaymentBlock from '../components/TrustPaymentBlock';

export default function Premium() {
  return (
    <div className="pb-20 md:pb-16">
      <section className="relative overflow-hidden py-14 sm:py-20 border-b border-surface-border">
        <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-400 mb-3">Business growth tools</p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight mb-3">
              Solutions that grow your campaign
            </h1>
            <p className="text-gray-400 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
              Affordable upgrades for real business problems — visibility, trust, marketing speed, and performance.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-14 sm:space-y-16">
        <WhyUpgradeSection />

        {/* Free */}
        <section className="page-section">
          <h2 className="section-title mb-2">Start free — stay useful</h2>
          <p className="section-subtitle mb-6">Core platform access with no paywall on essentials.</p>
          <div className="max-w-md">
            <PremiumPackageCard
              plan={{
                ...FREE_PLAN,
                button: 'Launch Free Campaign',
                painPoint: 'I need to get online without heavy costs.',
              }}
              showConversion={false}
              showButton={false}
            />
            <Link to="/upload" className="btn-primary w-full mt-4 py-3 min-h-[48px] text-center block">
              Launch Free Campaign
            </Link>
          </div>
        </section>

        {/* Bundles first — conversion focus */}
        <section className="page-section">
          <h2 className="section-title mb-2">Best value bundles</h2>
          <p className="section-subtitle mb-6">Everything bundled — rounded pricing, one payment, one reference.</p>
          <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
            {BUNDLE_PACKAGES.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <PremiumPackageCard plan={plan} showButton={false} />
                <Link to="/dashboard" className="btn-primary w-full mt-4 py-3 min-h-[48px] text-center block text-sm">
                  {plan.button} →
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Individual tools */}
        <section className="page-section">
          <h2 className="section-title mb-2">Pick your solution</h2>
          <p className="section-subtitle mb-6">One problem, one upgrade — only pay for what you need.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {PREMIUM_PACKAGES.map((plan, i) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
              >
                <PremiumPackageCard plan={plan} showButton={false} />
              </motion.div>
            ))}
          </div>
          <p className="text-center text-xs sm:text-sm text-gray-500 mt-8">
            Upgrade from your{' '}
            <Link to="/dashboard" className="text-brand-400 hover:underline">dashboard</Link>
            {' '}or campaign performance page.
          </p>
        </section>

        {/* Extended hosting — de-emphasized */}
        <section className="page-section">
          <h2 className="section-title mb-2">Extended hosting</h2>
          <p className="section-subtitle mb-6">Keep campaigns live longer with extended visibility.</p>
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
                  plan={{ ...plan, button: 'Extend Campaign', painPoint: plan.mainBenefit }}
                  compact
                  showConversion={false}
                  showButton={false}
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
