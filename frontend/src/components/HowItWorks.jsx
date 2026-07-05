import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, ShieldCheck, Share2 } from 'lucide-react';
import { BRAND_COPY } from '../data/brand';

const steps = [
  {
    icon: Upload,
    step: '1',
    title: 'Create your page',
    description: 'Add your candidate photo, party logo, message, and official links. Political templates help you launch in minutes.',
  },
  {
    icon: ShieldCheck,
    step: '2',
    title: 'Request verification (optional)',
    description: 'Apply for admin verification so voters know your page is authorized — not an impersonation.',
  },
  {
    icon: Share2,
    step: '3',
    title: 'Share one trusted link',
    description: 'Put your URL and QR code on posters, WhatsApp, and radio. One official home for your campaign.',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-20 sm:py-24 bg-surface-card/30 border-y border-surface-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="section-title">Three steps to your official page</h2>
          <p className="section-subtitle mx-auto">No complicated tools. Just a trusted public presence for your campaign.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="relative text-center md:text-left"
            >
              <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
                <div className="step-badge">{s.step}</div>
                <div>
                  <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center mb-3 mx-auto md:mx-0">
                    <s.icon className="w-5 h-5 text-brand-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{s.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{s.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link to="/upload" className="btn-primary px-8 py-3">{BRAND_COPY.launchCta}</Link>
        </div>
      </div>
    </section>
  );
}
