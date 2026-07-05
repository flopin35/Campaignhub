import { Lock, Sparkles } from 'lucide-react';
import { usePremiumModal } from '../context/PremiumModalContext';
import { PREMIUM_FEATURE_IDS } from '../data/premiumPackages';

const MESSAGES = {
  distribute: {
    title: 'Multi-platform sharing is Premium',
    description: 'Generate WhatsApp, Instagram, TikTok & Facebook posts with your official campaign link — one message, every platform.',
  },
  crm: {
    title: 'Supporter tools are Premium',
    description: 'Manage supporter sign-ups, MoMo donations, events & campaign updates from your campaign page.',
  },
  analytics: {
    title: 'Page analytics is Premium',
    description: 'See traffic sources, sign-ups, link copies, and page activity — know how citizens find your official page.',
  },
  ai: {
    title: 'AI Campaign Assistant is Premium',
    description: 'Full AI captions, tone variants (Gen Z, formal, slang), hashtags, CTAs, and message coaching.',
  },
  default: {
    title: 'Upgrade to CampaignHub Premium',
    description: 'Unlock AI message support, sharing formats, page analytics, and supporter tools for ₵500/month.',
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
