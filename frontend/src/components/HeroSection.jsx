import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function HeroSection({ campaignCount = 0 }) {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28 lg:py-32">
      <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-brand-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-500/20 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            {campaignCount > 0 && (
              <span className="inline-block px-3 py-1 mb-6 text-xs font-medium text-brand-300 bg-brand-600/10 border border-brand-500/20 rounded-full">
                {campaignCount} live campaign{campaignCount !== 1 ? 's' : ''} · real-time from Firestore
              </span>
            )}

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.08] tracking-tight mb-6">
              Your campaign
              <span className="block bg-gradient-to-r from-brand-300 to-brand-500 bg-clip-text text-transparent">
                operating system.
              </span>
            </h1>

            <p className="text-lg text-gray-400 max-w-xl mb-8 leading-relaxed">
              Launch, share, and track campaigns for businesses, politicians, creators, and organizations — free to start, trusted by design.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/upload" className="btn-primary text-base px-8 py-3.5 text-center">
                Launch Free Campaign
              </Link>
              <Link to="/campaigns" className="btn-secondary text-base px-8 py-3.5 text-center">
                Explore Campaigns
              </Link>
            </div>

            <div className="flex flex-wrap gap-4 mt-10 text-xs text-gray-500">
              <span>✓ Free hosting</span>
              <span>✓ QR & share links</span>
              <span>✓ Basic analytics</span>
              <span>✓ Admin verified</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
