import { formatCountdown } from '../utils/helpers';
import { isBoostActive } from '../utils/campaignHelpers';
import { Zap } from './icons/AppIcons';

export default function BoostBadge({ campaign, showTimer = true, className = '' }) {
  if (!isBoostActive(campaign)) return null;

  const remainingMs = campaign.boostRemainingMs ?? 0;

  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium ${className}`}>
      <Zap className="w-3 h-3" />
      {campaign.boostName || 'Boosted'}
      {showTimer && remainingMs > 0 && (
        <span className="text-amber-200/80">· {formatCountdown(remainingMs)}</span>
      )}
    </span>
  );
}
