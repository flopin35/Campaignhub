import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

const DEFAULT_STAGES = [
  'Securing your session…',
  'Verifying credentials…',
  'Restoring dashboard…',
];

export default function AuthLoading({
  message,
  stage,
  showBadge = true,
}) {
  const [stageIndex, setStageIndex] = useState(0);
  const stages = stage ? [stage, ...DEFAULT_STAGES] : DEFAULT_STAGES;
  const displayMessage = message || stages[stageIndex % stages.length];

  useEffect(() => {
    if (message || stage) return undefined;
    const interval = setInterval(() => {
      setStageIndex((i) => (i + 1) % stages.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [message, stage, stages.length]);

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm text-center"
      >
        <div className="relative mx-auto w-16 h-16 mb-6">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-600/30 to-brand-400/10 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-surface-card border border-surface-border flex items-center justify-center text-xs font-bold text-brand-400">
            CH
          </div>
        </div>

        <motion.p
          key={displayMessage}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm font-medium text-gray-200 mb-2"
        >
          {displayMessage}
        </motion.p>

        <div className="flex justify-center gap-1.5 mb-6">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-brand-500/60 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>

        {showBadge && (
          <div className="inline-flex items-center gap-2 text-xs text-gray-500 bg-surface-elevated/80 border border-surface-border rounded-full px-3 py-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            Protected by Firebase Security
          </div>
        )}
      </motion.div>
    </div>
  );
}
