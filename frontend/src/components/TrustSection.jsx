import { motion } from 'framer-motion';
import { Shield, Clock, CheckCircle2, Mail } from 'lucide-react';
import { PAYMENT_DETAILS } from '../data/packages';
import { Link } from 'react-router-dom';

const TRUST_POINTS = [
  {
    icon: Shield,
    title: 'Verified approvals',
    description: 'Every campaign and payment is reviewed by admin before going live.',
  },
  {
    icon: Clock,
    title: 'Clear status tracking',
    description: 'See exactly where your campaign is — pending, active, or expired — with timestamps.',
  },
  {
    icon: CheckCircle2,
    title: 'Secure uploads',
    description: 'Banner and payment proof uploads are confirmed with progress and preview.',
  },
  {
    icon: Mail,
    title: 'Real support',
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
          <h2 className="section-title">Built on trust</h2>
          <p className="section-subtitle mx-auto">
            CampaignHub is a visibility platform — not another ad site. We prioritize reliability, approval transparency, and real support.
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
