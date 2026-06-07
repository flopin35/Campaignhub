import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BUNDLE_PACKAGES, PREMIUM_PACKAGES } from '../data/premiumPackages';
import PremiumPackageCard from './PremiumPackageCard';

export default function PremiumFeaturesSection() {
  const preview = [BUNDLE_PACKAGES[1], ...PREMIUM_PACKAGES.slice(0, 2)];

  return (
    <section className="py-20 sm:py-24 bg-surface-card/40 border-y border-surface-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-400 mb-3">Affordable premium</p>
          <h2 className="section-title">Upgrade when you need more</h2>
          <p className="section-subtitle mx-auto">
            From ₵25 boosts to ₵349 complete bundles — solve real pain points without overpaying.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {preview.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <PremiumPackageCard plan={plan} compact showButton={false} />
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link to="/premium" className="btn-primary px-8 py-3">View All Plans</Link>
        </div>
      </div>
    </section>
  );
}
