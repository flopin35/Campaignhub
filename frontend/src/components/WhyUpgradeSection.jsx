import { motion } from 'framer-motion';
import { Shield, Search, FileText, Calendar, Link2 } from 'lucide-react';

const REASONS = [
  {
    icon: Shield,
    title: 'Public trust',
    description:
      'Voters and media need to know your page is authorized. Admin verification shows your campaign page is official — not an impersonator.',
  },
  {
    icon: Search,
    title: 'Campaign discovery',
    description:
      'A page no one can find helps no one. Premium keeps you visible in the public campaign directory when citizens are looking.',
  },
  {
    icon: FileText,
    title: 'Clear campaign message',
    description:
      'AI support helps you write slogans, captions, and updates that sound like you — ready for posters, WhatsApp, and radio mentions.',
  },
  {
    icon: Calendar,
    title: 'Election-period hosting',
    description:
      'Campaigns run longer than 14 days. Extended hosting keeps your official page live through the full election period.',
  },
  {
    icon: Link2,
    title: 'One official link',
    description:
      'Share a single official campaign URL and QR code everywhere. One trusted source for your biography, party, events, and updates.',
  },
];

export default function WhyUpgradeSection() {
  return (
    <section className="page-section">
      <div className="text-center mb-10 sm:mb-12">
        <h2 className="section-title">Why campaigns upgrade</h2>
        <p className="section-subtitle mx-auto">
          Premium is about official presence — verification, visibility, and a page voters can trust and find.
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
