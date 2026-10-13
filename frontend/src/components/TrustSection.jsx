import { motion } from 'framer-motion';
import { Shield, BadgeCheck, FileArchive, Mail } from 'lucide-react';
import { PAYMENT_DETAILS } from '../data/packages';
import { Link } from 'react-router-dom';

const TRUST_POINTS = [
  {
    icon: Shield,
    title: 'Official Page badge',
    description: 'Only admin-authorized pages show Official Page — so citizens know the campaign is real.',
  },
  {
    icon: BadgeCheck,
    title: 'Clear page status',
    description: 'Campaign pages are labelled Active, Hidden, Archived, or Retained — never silently erased without reason.',
  },
  {
    icon: FileArchive,
    title: 'Archive & retention',
    description: 'Past campaign pages may be hidden, archived, or retained for the public record — not deleted by default.',
  },
  {
    icon: Mail,
    title: 'Human support',
    description: `Reach us at ${PAYMENT_DETAILS.supportEmail} — Mon–Sat, 9am–6pm GMT.`,
  },
];

export default function TrustSection() {
  return (
    <section className="py-20 sm:py-24 border-t border-surface-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="section-title">Why citizens can trust these pages</h2>
          <p className="section-subtitle mx-auto">
            In Ghanaian politics, the wrong link spreads fast. CampaignHub helps voters find the official campaign home.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {TRUST_POINTS.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="feature-card p-6"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                <item.icon className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link to="/support" className="btn-secondary px-6 py-2.5 text-sm">
            Support & policies →
          </Link>
        </div>
      </div>
    </section>
  );
}
