import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function HeroSection({ campaignCount = 0 }) {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32 lg:py-36">
      <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-brand-600/15 rounded-full blur-[100px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-500/30 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          {campaignCount > 0 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-block px-4 py-1.5 mb-8 text-sm font-medium text-brand-300 bg-brand-600/10 border border-brand-500/25 rounded-full"
            >
              {campaignCount} live campaign{campaignCount !== 1 ? 's' : ''} right now
            </motion.span>
          )}

          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-[1.1] tracking-tight mb-6">
            Launch campaigns that
            <br />
            <span className="bg-gradient-to-r from-brand-300 via-brand-400 to-brand-500 bg-clip-text text-transparent">
              get attention.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload political, business or awareness campaigns in minutes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/upload" className="btn-primary text-base px-8 py-3.5 w-full sm:w-auto min-w-[200px]">
              Launch Campaign
            </Link>
            <Link to="/campaigns" className="btn-secondary text-base px-8 py-3.5 w-full sm:w-auto min-w-[200px]">
              Explore Campaigns
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
