import { motion } from 'framer-motion';
import { QrCode, BarChart3, Shield, Smartphone } from 'lucide-react';

const features = [
  {
    icon: QrCode,
    title: 'Share anywhere',
    description: 'Every campaign gets a link and QR code — posters, WhatsApp, events, and social.',
  },
  {
    icon: BarChart3,
    title: 'Real analytics',
    description: 'Track views, shares, and QR scans live. No fake numbers — all from Firestore.',
  },
  {
    icon: Shield,
    title: 'Trusted approvals',
    description: 'Admin-verified campaigns and payment proof. Built to reduce scams and build confidence.',
  },
  {
    icon: Smartphone,
    title: 'Mobile-first',
    description: 'Designed for Android and iPhone — fast, touch-friendly, lightweight on low-end devices.',
  },
];

export default function FeatureSection() {
  return (
    <section className="py-20 sm:py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14"
        >
          <h2 className="section-title">Solve real advertising pain points</h2>
          <p className="section-subtitle">
            Billboards are expensive with no tracking. Social media is slow and untrusted. CampaignHub gives you speed, visibility, and proof.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="feature-card p-6"
            >
              <div className="w-11 h-11 rounded-xl bg-brand-600/12 border border-brand-500/20 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-brand-400" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
