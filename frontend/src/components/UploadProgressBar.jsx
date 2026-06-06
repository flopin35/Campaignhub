import { motion } from 'framer-motion';
import { Check } from './icons/AppIcons';

export default function UploadProgressBar({ progress = 0, label = 'Uploading…', status = 'uploading' }) {
  const pct = Math.min(100, Math.max(0, progress));

  const statusColors = {
    uploading: 'from-brand-500 to-violet-500',
    success: 'from-emerald-500 to-teal-500',
    error: 'from-red-500 to-rose-500',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className={`font-medium ${status === 'error' ? 'text-red-400' : status === 'success' ? 'text-emerald-400' : 'text-gray-300'}`}>
          {status === 'success' ? 'Upload complete' : status === 'error' ? 'Upload failed' : label}
        </span>
        {status === 'uploading' && <span className="text-brand-400 tabular-nums">{pct}%</span>}
        {status === 'success' && <Check className="w-4 h-4 text-emerald-400" />}
      </div>
      <div className="h-2 rounded-full bg-surface-border overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${statusColors[status] || statusColors.uploading}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
