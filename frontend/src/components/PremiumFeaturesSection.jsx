import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Calendar, Search } from 'lucide-react';

const PRESENCE = [
  {
    icon: Shield,
    title: 'Admin authorization',
    description: 'Request review so your page can display the Official Page badge voters and media recognize.',
    cta: 'Verification & hosting',
    to: '/premium',
  },
  {
    icon: Calendar,
    title: 'Stay live through election day',
    description: 'Extend hosting so your official campaign page remains available for the full campaign period.',
    cta: 'View hosting options',
    to: '/premium',
  },
  {
    icon: Search,
    title: 'Found in the directory',
    description: 'Help citizens find your official page in the public campaign directory across Ghana.',
    cta: 'Browse campaign pages',
    to: '/campaigns',
  },
];

/** Short presence block — not a SaaS feature grid. */
export default function PremiumFeaturesSection() {
  return (
    <section className="py-20 sm:py-24 bg-surface-card/40 border-y border-surface-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="section-title">Stay official through election day</h2>
          <p className="section-subtitle mx-auto">
            Authorization, longer hosting, and directory presence — so your campaign home stays trusted and findable.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PRESENCE.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass-card p-6 flex flex-col"
            >
              <div className="w-11 h-11 rounded-xl bg-brand-600/12 border border-brand-500/20 flex items-center justify-center mb-4">
                <item.icon className="w-5 h-5 text-brand-400" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed flex-1 mb-4">{item.description}</p>
              <Link to={item.to} className="text-sm text-brand-400 hover:text-brand-300 font-medium">
                {item.cta} →
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
