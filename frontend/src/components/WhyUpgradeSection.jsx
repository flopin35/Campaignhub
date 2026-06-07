import { motion } from 'framer-motion';
import { Eye, Shield, Zap, BarChart3, Clock } from 'lucide-react';

const REASONS = [
  {
    icon: Eye,
    title: 'More Visibility',
    description: 'Billboards and social posts disappear fast. Premium puts your campaign where people actually browse.',
  },
  {
    icon: Shield,
    title: 'Better Trust',
    description: 'Verified badges and admin-approved campaigns help customers feel safe engaging with your business.',
  },
  {
    icon: Zap,
    title: 'Faster Marketing',
    description: 'AI tools create slogans, captions, and CTAs in seconds — no marketing team required.',
  },
  {
    icon: BarChart3,
    title: 'Better Performance',
    description: 'See what works with real analytics. Improve campaigns instead of guessing.',
  },
  {
    icon: Clock,
    title: 'Time Savings',
    description: 'Generate platform-ready content once and share everywhere. Less work, more reach.',
  },
];

export default function WhyUpgradeSection() {
  return (
    <section className="page-section">
      <div className="text-center mb-10 sm:mb-12">
        <h2 className="section-title">Why Businesses Upgrade</h2>
        <p className="section-subtitle mx-auto">
          Premium is not about features — it is about solving problems that cost you customers, time, and money.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {REASONS.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06 }}
            className="feature-card p-5 sm:p-6"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-600/12 border border-brand-500/20 flex items-center justify-center mb-4">
              <item.icon className="w-5 h-5 text-brand-400" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">{item.title}</h3>
            <p className="text-sm text-gray-400 leading-relaxed">{item.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
