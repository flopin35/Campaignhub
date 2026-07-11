import { Lock, Sparkles } from 'lucide-react';
import { usePremiumModal } from '../context/PremiumModalContext';
import { PREMIUM_FEATURE_IDS } from '../data/premiumPackages';
import { hasPremiumSubscription } from '../utils/featureAccess';

const MESSAGES = {
  distribute: {
    title: 'Multi-platform sharing is Premium',
    description: 'Generate WhatsApp, Instagram, TikTok & Facebook posts with your official campaign link — one message, every platform.',
  },
  supporters: {
    title: 'Supporter tools are Premium',
    description: 'Collect update sign-ups, confirm MoMo support, and list events on your official campaign page.',
  },
  crm: {
    title: 'Supporter tools are Premium',
    description: 'Collect update sign-ups, confirm MoMo support, and list events on your official campaign page.',
  },
  analytics: {
    title: 'Detailed page activity is Premium',
    description: 'See how citizens find your official page — traffic sources, sign-ups, and link activity.',
  },
  ai: {
    title: 'AI message support is Premium',
    description: 'Captions, tone variants, hashtags, and message coaching for your campaign communications.',
  },
  default: {
    title: 'Upgrade to CampaignHub Premium',
    description: 'Official presence — authorization review path, hosting, and directory visibility for ₵500/month.',
  },
};

export default function PremiumGate({
  campaign,
  feature = 'default',
  title,
  description,
  compact = false,
}) {
  const { openPremiumModal } = usePremiumModal();
  const copy = MESSAGES[feature] || MESSAGES.default;

  if (hasPremiumSubscription(campaign)) return null;

  const handleUpgrade = () => {
    openPremiumModal({
      campaign,
      planId: PREMIUM_FEATURE_IDS.PREMIUM_SUBSCRIPTION,
    });
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleUpgrade}
        className="w-full text-left p-4 rounded-xl border border-brand-500/25 bg-brand-600/10 hover:bg-brand-600/15 transition-colors touch-manipulation"
      >
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-brand-400 shrink-0" />
          <span className="text-sm font-medium text-white">{title || copy.title}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1 ml-6">{description || copy.description}</p>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-brand-500/20 bg-gradient-to-br from-brand-600/10 to-surface-elevated/50 p-6 sm:p-8 text-center">
      <div className="w-12 h-12 rounded-xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center mx-auto mb-4">
        <Lock className="w-6 h-6 text-brand-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title || copy.title}</h3>
      <p className="text-sm text-gray-400 max-w-md mx-auto mb-6 leading-relaxed">
        {description || copy.description}
      </p>
      <button type="button" onClick={handleUpgrade} className="btn-primary inline-flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        Upgrade — ₵500/month
      </button>
      <p className="text-[10px] text-gray-600 mt-4">Free plan: launch page, official link, QR &amp; basic stats</p>
    </div>
  );
}
