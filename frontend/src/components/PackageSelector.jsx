import { useState } from 'react';
import { motion } from 'framer-motion';
import { PACKAGES } from '../data/packages';
import { Check } from './icons/AppIcons';

export default function PackageSelector({ selected, onSelect, loading }) {
  const [pending, setPending] = useState(selected || null);

  const handleContinue = () => {
    if (pending && onSelect) onSelect(pending);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Choose Your Plan</h2>
        <p className="text-sm text-gray-500">
          Start free with full essentials — upgrade for extended visibility and featured placement.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 lg:gap-5">
        {PACKAGES.map((pkg, i) => (
          <motion.button
            key={pkg.id}
            type="button"
            disabled={loading}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            onClick={() => setPending(pkg)}
            className={`package-card disabled:opacity-60 disabled:pointer-events-none relative ${
              pending?.id === pkg.id ? 'package-card-selected' : ''
            } ${pkg.isFree ? 'border-emerald-500/30' : ''}`}
          >
            {pkg.isFree && (
              <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                Free
              </span>
            )}
            <div className="flex items-start justify-between mb-3 pr-12">
              <h3 className="font-semibold text-white text-lg">{pkg.name}</h3>
              <span className={`font-bold text-lg ${pkg.isFree ? 'text-emerald-400' : 'text-brand-400'}`}>
                {pkg.isFree ? '0 GHS' : `${pkg.price} GHS`}
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-4">{pkg.description}</p>
            <ul className="space-y-2">
              {pkg.features.map((f) => (
                <li key={f} className="text-xs text-gray-400 flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <p className="text-xs text-brand-400/80 mt-4 font-medium">{pkg.durationDays} days duration</p>
          </motion.button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleContinue}
        disabled={!pending || loading}
        className="btn-primary w-full py-3.5 text-base disabled:opacity-50"
      >
        {loading
          ? 'Uploading & creating…'
          : pending
            ? pending.isFree
              ? `Launch Free Campaign →`
              : `Continue with ${pending.name} →`
            : 'Select a plan to continue'}
      </button>
    </div>
  );
}
