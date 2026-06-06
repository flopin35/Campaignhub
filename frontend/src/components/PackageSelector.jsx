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
        <h2 className="text-xl font-bold text-white mb-1">Choose Your Package</h2>
        <p className="text-sm text-gray-500">Select how long and how prominently your campaign runs.</p>
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
            className={`package-card disabled:opacity-60 disabled:pointer-events-none ${
              pending?.id === pkg.id ? 'package-card-selected' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-white text-lg">{pkg.name}</h3>
              <span className="text-brand-400 font-bold text-lg">{pkg.price} GHS</span>
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
        {loading ? 'Uploading & creating…' : pending ? `Continue with ${pending.name} →` : 'Select a package to continue'}
      </button>
    </div>
  );
}
