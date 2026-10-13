import { motion } from 'framer-motion';
import { QrCode, Link2, Shield, Smartphone } from 'lucide-react';

const features = [
  {
    icon: Link2,
    title: 'Official campaign link',
    description: 'Every campaign page gets one official campaign link voters, media, and supporters can trust and return to.',
  },
  {
    icon: QrCode,
    title: 'Official campaign QR code',
    description: 'Download an official campaign QR code for flyers, billboards, and rally materials — scan to open your official page.',
  },
  {
    icon: Shield,
    title: 'Admin authorization',
    description: 'Admin-authorized pages show an Official Page badge so citizens can tell real campaign pages from impersonations.',
  },
  {
    icon: Smartphone,
    title: 'Built for Ghana campaigns',
    description: 'Share your official campaign page in one tap — mobile-first for WhatsApp, posters, and the trail.',
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
          <h2 className="section-title">A clear public home for your campaign page</h2>
          <p className="section-subtitle">
            One official campaign page for your candidate, party, message, and links — simple enough for every voter to find.
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
