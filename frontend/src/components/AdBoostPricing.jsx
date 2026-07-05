import { Zap } from 'lucide-react';
import { BOOST_PACKAGES } from '../data/boostPackages';

/**
 * Ad boost tier cards — mobile-first, no overlapping badges, GHS always visible.
 */
export default function AdBoostPricing({ onSelect, selectedId = null, compact = false }) {
  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {!compact && (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Choose boost duration</p>
            <p className="text-xs text-gray-500">Homepage spotlight · priority ranking · boost badge</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {BOOST_PACKAGES.map((pkg) => {
          const isSelected = selectedId === pkg.id;
          const Wrapper = onSelect ? 'button' : 'div';

          return (
            <Wrapper
              key={pkg.id}
              type={onSelect ? 'button' : undefined}
              onClick={onSelect ? () => onSelect(pkg) : undefined}
              disabled={onSelect ? false : undefined}
              className={`w-full text-left rounded-xl border p-4 sm:p-5 transition-all touch-manipulation ${
                onSelect ? 'cursor-pointer hover:border-amber-500/40 active:scale-[0.99]' : ''
              } ${
                isSelected
                  ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/25'
                  : 'border-surface-border bg-surface-elevated/70 hover:bg-surface-elevated'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="text-sm sm:text-base font-semibold text-white">{pkg.label}</p>
                  {pkg.tagline && (
                    <p className="text-[11px] text-gray-500 mt-0.5">{pkg.tagline}</p>
                  )}
                </div>
                {(pkg.popular || pkg.featured) && (
                  <span
                    className={`shrink-0 text-[9px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${
                      pkg.featured
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
                    }`}
                  >
                    {pkg.featured ? 'Max' : 'Popular'}
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-1.5 pt-2 border-t border-surface-border/60">
                <span className={`text-2xl sm:text-3xl font-bold tabular-nums ${isSelected ? 'text-amber-300' : 'text-white'}`}>
                  {pkg.price}
                </span>
                <span className="text-sm font-semibold text-gray-400 uppercase tracking-wide">GHS</span>
              </div>
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}
