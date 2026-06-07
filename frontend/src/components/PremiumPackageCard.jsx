import { motion } from 'framer-motion';
import { Check } from './icons/AppIcons';
import { getBundleSavings } from '../utils/contentQuality';

export default function PremiumPackageCard({
  plan,
  selected = false,
  onSelect,
  onAction,
  active = false,
  compact = false,
  showButton = true,
  showConversion = true,
}) {
  const priceDisplay = plan.priceLabel
    || (plan.priceFrom ? `From ₵${plan.priceFrom}` : plan.price === 0 ? '₵0' : `₵${plan.price}`);
  const isPopular = plan.badge === 'Most Popular';
  const savings = getBundleSavings(plan);

  return (
    <motion.div
      whileHover={onSelect && !active ? { y: -3 } : undefined}
      transition={{ duration: 0.2 }}
      className={`premium-card relative flex flex-col h-full ${selected ? 'premium-card-selected' : ''} ${isPopular ? 'premium-card-popular premium-card-glow' : ''} ${plan.isBundle ? 'premium-card-bundle' : ''} ${active ? 'opacity-75' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-2 absolute -top-2.5 left-4 right-4">
        {plan.badge && (
          <span className="text-[10px] font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-brand-600/20 text-brand-300 border border-brand-500/25">
            {plan.badge}
          </span>
        )}
        {savings > 0 && (
          <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 ml-auto">
            Save ₵{savings}
          </span>
        )}
      </div>

      <div className={`flex-1 ${plan.badge || savings ? 'pt-3' : ''}`}>
        <p className="text-sm font-semibold text-white mb-1">{plan.label || plan.name}</p>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-xl sm:text-2xl font-bold text-white">{priceDisplay}</span>
          {plan.originalPrice && plan.originalPrice > plan.price && (
            <span className="text-xs text-gray-600 line-through">₵{plan.originalPrice}</span>
          )}
        </div>

        {showConversion && plan.problem && (
          <div className="space-y-2 mb-4">
            <p className="text-xs text-gray-500 leading-relaxed">
              <span className="text-gray-600">Problem: </span>{plan.problem}
            </p>
            <p className="text-xs text-brand-400/90 leading-relaxed">
              <span className="text-brand-500/70">Benefit: </span>{plan.benefit}
            </p>
            <p className="text-xs text-emerald-400/80 leading-relaxed">
              <span className="text-emerald-500/60">Result: </span>{plan.result}
            </p>
          </div>
        )}

        {!showConversion && (
          <>
            <p className="text-xs text-brand-400/90 mb-2 leading-relaxed">{plan.mainBenefit || plan.tagline}</p>
            <p className="text-[11px] text-gray-600 italic mb-4">"{plan.painPoint}"</p>
          </>
        )}

        {!compact && (
          <ul className="space-y-2 mb-4">
            {plan.features.map((f) => (
              <li key={f} className="text-xs text-gray-400 flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
        )}

        {plan.bestFor && !compact && (
          <p className="text-[10px] text-gray-600">Best for: {plan.bestFor}</p>
        )}

        {plan.variants && (
          <div className="flex flex-wrap gap-2 mt-3">
            {plan.variants.map((v) => (
              <span key={v.id} className="text-[10px] px-2 py-1 rounded-md bg-surface-elevated border border-surface-border text-gray-400">
                {v.label} · ₵{v.price}
              </span>
            ))}
          </div>
        )}
      </div>

      {active ? (
        <span className="text-xs font-medium text-emerald-400 mt-4 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Active on this campaign
        </span>
      ) : showButton && (
        <button
          type="button"
          onClick={() => (onAction ? onAction(plan) : onSelect?.(plan))}
          className={`mt-4 w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 min-h-[44px] ${
            isPopular || selected
              ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-glow-sm'
              : 'bg-surface-elevated hover:bg-brand-600/20 text-gray-200 border border-surface-border hover:border-brand-500/40'
          }`}
        >
          {plan.button || 'Upgrade'}
        </button>
      )}
    </motion.div>
  );
}
