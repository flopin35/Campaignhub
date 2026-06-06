import { motion } from 'framer-motion';
import { QrCode, BarChart3, Zap } from 'lucide-react';

const features = [
  {
    icon: QrCode,
    title: 'QR Sharing',
    description: 'Every campaign gets a unique QR code and share link — perfect for posters, flyers, and social media.',
  },
  {
    icon: BarChart3,
    title: 'Campaign Analytics',
    description: 'Track views, shares, and clicks in real time so you know what is working.',
  },
  {
    icon: Zap,
    title: 'Fast Approval',
    description: 'Pay via mobile money, upload proof, and go live after quick admin verification.',
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
          className="text-center mb-14"
        >
          <h2 className="section-title">Built for modern campaigns</h2>
          <p className="section-subtitle mx-auto">
            Simple tools politicians, businesses, and organizers use to reach more people.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="feature-card p-8"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-600/15 border border-brand-500/25 flex items-center justify-center mb-5">
                <f.icon className="w-6 h-6 text-brand-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Re-export QrCode from lucide via AppIcons - need to add it