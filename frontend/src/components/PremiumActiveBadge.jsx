import { Sparkles, CheckCircle2 } from 'lucide-react';
import { hasPremiumSubscription, getPremiumExpiryLabel } from '../utils/featureAccess';

export default function PremiumActiveBadge({ campaign, variant = 'inline', className = '' }) {
  if (!hasPremiumSubscription(campaign)) return null;

  const expiry = getPremiumExpiryLabel(campaign);

  if (variant === 'banner') {
    return (
      <div
        className={`p-3 sm:p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-3 ${className}`}
        role="status"
        aria-label="CampaignHub Premium is active. This is not the Official Page badge."
      >
        <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-emerald-400" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-emerald-300">Using CampaignHub Premium</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {expiry} — hosting &amp; authorization review path. Does not grant the Official Page badge by itself.
          </p>
        </div>
        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden />
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center gap-1.5 text-sm py-2 px-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 ${className}`}
      title={`CampaignHub Premium · ${expiry}. Not the Official Page badge.`}
      role="status"
      aria-label={`CampaignHub Premium active, ${expiry}. Not an Official Page badge.`}
    >
      <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden />
      <span className="font-medium">Using Premium</span>
      <span className="text-emerald-400/80 text-xs">· {expiry}</span>
    </span>
  );
}
