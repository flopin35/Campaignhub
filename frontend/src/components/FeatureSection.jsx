import { motion } from 'framer-motion';
import { QrCode, Link2, Shield, Smartphone } from 'lucide-react';

const features = [
  {
    icon: Link2,
    title: 'One official URL',
    description: 'Every campaign gets a permanent link voters, media, and supporters can trust and return to.',
  },
  {
    icon: QrCode,
    title: 'QR for posters',
    description: 'Download a QR code for flyers, billboards, and rally materials — scan to reach your official page.',
  },
  {
    icon: Shield,
    title: 'Admin verification',
    description: 'Optional admin verification helps citizens distinguish official campaign pages from impersonators.',
  },
  {
    icon: Smartphone,
    title: 'WhatsApp-ready',
    description: 'Share in one tap. Built for how Ghana campaigns actually reach people — mobile-first.',
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
          <h2 className="section-title">Everything a campaign page needs</h2>
          <p className="section-subtitle">
            Not an operating system. Not a marketplace. A clear, trusted public home for your political campaign.
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
