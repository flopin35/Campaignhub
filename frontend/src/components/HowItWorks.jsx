import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, CreditCard, CheckCircle2 } from 'lucide-react';

const steps = [
  {
    icon: Upload,
    step: '1',
    title: 'Upload Campaign',
    description: 'Add your banner, details, and pick a package that fits your budget.',
  },
  {
    icon: CreditCard,
    step: '2',
    title: 'Make Payment',
    description: 'Send mobile money using your unique reference, then upload payment proof.',
  },
  {
    icon: CheckCircle2,
    step: '3',
    title: 'Admin Approves & Goes Live',
    description: 'After verification your campaign goes live with a share link and QR code.',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-20 sm:py-24 bg-surface-card/40 border-y border-surface-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="section-title">How it works</h2>
          <p className="section-subtitle mx-auto">Three simple steps from upload to live campaign.</p>
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
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-5 -right-6 lg:-right-8 text-surface-border text-2xl">→</div>
              )}
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link to="/upload" className="btn-primary px-8 py-3">Start Your Campaign</Link>
        </div>
      </div>
    </section>
  );
}
