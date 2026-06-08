import { motion } from 'framer-motion';
import AuthTrustBadge from './AuthTrustBadge';

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-10 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-600/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-hero-glow pointer-events-none opacity-60" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-md relative"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-500 flex items-center justify-center text-white font-bold text-lg mx-auto mb-4 shadow-lg shadow-brand-600/25"
          >
            CH
          </motion.div>
          <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
          <p className="text-gray-400 text-sm max-w-xs mx-auto">{subtitle}</p>
        </div>

        <div className="card space-y-5 auth-card backdrop-blur-sm">
          {children}
          <AuthTrustBadge />
        </div>

        {footer && <div className="mt-6 text-center">{footer}</div>}
      </motion.div>
    </div>
  );
}
