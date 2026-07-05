/** Premium monetization — one subscription + separate ad boosts. */

import { BOOST_PACKAGES, getBoostVariantsForPremium, getBoostPriceRange } from './boostPackages';

const boostRange = getBoostPriceRange();

export const PREMIUM_FEATURE_IDS = {
  VISIBILITY_BOOST: 'visibility-boost',
  AI_ASSISTANT: 'ai-assistant',
  VERIFIED_BADGE: 'verified-badge',
  ADVANCED_ANALYTICS: 'advanced-analytics',
  MULTI_PLATFORM: 'multi-platform',
  PREMIUM_SUBSCRIPTION: 'premium-subscription',
  CAMPAIGN_CRM: 'campaign-crm',
  /** @deprecated legacy bundle ids — map to premium-subscription */
  GROWTH_BUNDLE: 'growth-bundle',
  COMPLETE_BUNDLE: 'complete-bundle',
};

export const SUBSCRIPTION_PRICE = 500;

export const FREE_PLAN = {
  id: 'free',
  name: 'Free Campaign',
  label: 'Free Plan',
  price: 0,
  priceLabel: '₵0',
  mainBenefit: 'Launch an official campaign page with everything essential — no paywall on core features.',
  features: [
    'Campaign page hosting',
    'Banner uploads',
    'Official campaign links',
    'Official campaign QR code',
    'Basic page analytics',
    'My Campaign Pages',
    'Approval system',
    'Basic AI caption generator',
  ],
};

/** Everything except ad boost — one subscription */
export const SUBSCRIPTION_PACKAGE = {
  id: PREMIUM_FEATURE_IDS.PREMIUM_SUBSCRIPTION,
  name: 'CampaignHub Premium',
  label: 'CampaignHub Premium',
  button: 'Subscribe — ₵500',
  badge: 'All-in-one',
  tagline: 'One subscription — verification, hosting & presence',
  painPoint: 'I need verification, hosting, and presence tools without juggling payments.',
  problem: 'Buying each premium option separately is expensive and confusing.',
  benefit: 'One ₵500 subscription unlocks admin verification, extended hosting, AI support, and directory visibility.',
  result: 'A trusted official campaign presence with a single payment and one reference.',
  bestFor: 'Candidates, parties, and constituency campaigns',
  price: SUBSCRIPTION_PRICE,
  priceLabel: `₵${SUBSCRIPTION_PRICE} / month`,
  durationDays: 30,
  icon: 'bundle',
  features: [
    'AI Campaign Assistant (30 days)',
    'Admin verification badge',
    'Page analytics (30 days)',
    'Multi-platform sharing formats (30 days)',
    'Supporter sign-ups, donations & events',
    'WhatsApp sharing & MoMo donation links',
  ],
  includes: [
    PREMIUM_FEATURE_IDS.AI_ASSISTANT,
    PREMIUM_FEATURE_IDS.VERIFIED_BADGE,
    PREMIUM_FEATURE_IDS.ADVANCED_ANALYTICS,
    PREMIUM_FEATURE_IDS.MULTI_PLATFORM,
    PREMIUM_FEATURE_IDS.CAMPAIGN_CRM,
  ],
  purchasable: true,
  isBundle: true,
  isSubscription: true,
};

/** Ad boost — separate from subscription (tiered pricing) */
export const PREMIUM_PACKAGES = [
  {
    id: PREMIUM_FEATURE_IDS.VISIBILITY_BOOST,
    name: 'Ad Boost',
    label: '🔥 Ad Boost',
    button: 'Boost Campaign',
    badge: 'Extra visibility',
    tagline: 'Get discovered when it matters most',
    painPoint: 'My campaign page is not getting enough visibility in the directory.',
    problem: 'Your official page is live but citizens are not finding it.',
    benefit: 'Appear on the homepage spotlight and rise in the campaign directory.',
    result: 'More citizens discover your official campaign page and message.',
    bestFor: 'Candidates, parties, and constituency campaigns',
    priceFrom: boostRange.min,
    icon: 'zap',
    features: [
      'Homepage spotlight',
      'Directory priority placement',
      'Priority campaign ranking',
      'Increased directory visibility',
      'Boost badge',
    ],
    purchasable: true,
    variants: getBoostVariantsForPremium(),
  },
];

/** Included in subscription — display only, not sold separately */
export const PREMIUM_INCLUDED_FEATURES = [
  {
    id: PREMIUM_FEATURE_IDS.AI_ASSISTANT,
    name: 'AI Campaign Assistant',
    label: '🤖 AI Campaign Assistant',
    tagline: 'Campaign message support when you need it',
    priceLabel: 'Included',
    features: ['AI slogans', 'AI captions', 'AI hashtags', 'CTA suggestions', 'Update & news ideas'],
  },
  {
    id: PREMIUM_FEATURE_IDS.VERIFIED_BADGE,
    name: 'Admin Verification Badge',
    label: '✔ Admin Verification Badge',
    tagline: 'Show voters your page is authorized',
    priceLabel: 'Included',
    features: ['Admin verification badge', 'Public trust signal', 'Directory distinction'],
  },
  {
    id: PREMIUM_FEATURE_IDS.ADVANCED_ANALYTICS,
    name: 'Page Analytics',
    label: '📊 Page Analytics',
    tagline: 'See how citizens find your page',
    priceLabel: 'Included',
    features: ['Page visit insights', 'Link & share tracking', 'Campaign page performance'],
  },
  {
    id: PREMIUM_FEATURE_IDS.MULTI_PLATFORM,
    name: 'Multi-Platform Sharing',
    label: '🌍 Multi-Platform Sharing',
    tagline: 'One message, every platform',
    priceLabel: 'Included',
    features: ['WhatsApp format', 'Facebook copy', 'Instagram copy', 'TikTok copy'],
  },
];

/** @deprecated use SUBSCRIPTION_PACKAGE */
export const BUNDLE_PACKAGES = [SUBSCRIPTION_PACKAGE];

export const HOSTING_PACKAGES = [
  {
    id: 'hosting-basic',
    name: 'Extended Basic',
    price: SUBSCRIPTION_PRICE,
    priceLabel: `₵${SUBSCRIPTION_PRICE}`,
    durationDays: 7,
    priorityLevel: 1,
    featured: false,
    spotlight: false,
    mainBenefit: '7 extra days of standard directory visibility',
    features: ['Standard card placement', '7 days live', 'Priority listing', 'Official campaign link & QR code'],
    purchasable: true,
    purchaseType: 'hosting',
  },
  {
    id: 'hosting-boost',
    name: 'Extended Boost',
    price: SUBSCRIPTION_PRICE,
    priceLabel: `₵${SUBSCRIPTION_PRICE}`,
    durationDays: 14,
    priorityLevel: 2,
    featured: false,
    spotlight: false,
    mainBenefit: '14 days with homepage directory visibility',
    features: ['Homepage listing', 'Medium banner size', '14 days live', 'Extended directory presence'],
    purchasable: true,
    purchaseType: 'hosting',
  },
  {
    id: 'hosting-premium',
    name: 'Extended Premium',
    price: SUBSCRIPTION_PRICE,
    priceLabel: `₵${SUBSCRIPTION_PRICE}`,
    durationDays: 30,
    priorityLevel: 3,
    featured: true,
    spotlight: false,
    badge: 'Featured hosting',
    mainBenefit: '30 days featured directory placement',
    features: ['Featured placement', 'Large banner', '30 days live', 'Priority directory visibility'],
    purchasable: true,
    purchaseType: 'hosting',
  },
  {
    id: 'hosting-elite',
    name: 'Extended Elite',
    price: SUBSCRIPTION_PRICE,
    priceLabel: `₵${SUBSCRIPTION_PRICE}`,
    durationDays: 45,
    priorityLevel: 4,
    featured: true,
    spotlight: true,
    badge: 'Top spotlight',
    mainBenefit: '45 days top homepage spotlight',
    features: ['Top homepage spotlight', 'Elite badge', '45 days live', 'Priority approval'],
    purchasable: true,
    purchaseType: 'hosting',
  },
];

const LEGACY_PLAN_ALIASES = {
  [PREMIUM_FEATURE_IDS.GROWTH_BUNDLE]: PREMIUM_FEATURE_IDS.PREMIUM_SUBSCRIPTION,
  [PREMIUM_FEATURE_IDS.COMPLETE_BUNDLE]: PREMIUM_FEATURE_IDS.PREMIUM_SUBSCRIPTION,
};

/** Purchasable: subscription + ad boost + hosting */
export const ALL_PREMIUM_PLANS = [SUBSCRIPTION_PACKAGE, ...PREMIUM_PACKAGES];

export function resolvePlanId(id) {
  return LEGACY_PLAN_ALIASES[id] || id;
}

export function getPremiumPackageById(id) {
  const resolved = resolvePlanId(id);
  if (resolved === PREMIUM_FEATURE_IDS.PREMIUM_SUBSCRIPTION) return SUBSCRIPTION_PACKAGE;
  return PREMIUM_PACKAGES.find((p) => p.id === resolved) || null;
}

export function getHostingPackageById(id) {
  return HOSTING_PACKAGES.find((p) => p.id === id) || null;
}

export function getPurchasablePlan(id) {
  const resolved = resolvePlanId(id);
  if (resolved === PREMIUM_FEATURE_IDS.PREMIUM_SUBSCRIPTION) return SUBSCRIPTION_PACKAGE;
  return getPremiumPackageById(resolved) || getHostingPackageById(resolved) || null;
}

export function getPremiumVariant(featureId, variantId) {
  const pkg = PREMIUM_PACKAGES.find((p) => p.id === featureId);
  if (!pkg?.variants) return null;
  return pkg.variants.find((v) => v.id === variantId) || null;
}

export function formatPrice(amount) {
  return `₵${amount}`;
}

export function getUpgradeDashboardUrl(planId, variantId = null) {
  if (!getPurchasablePlan(planId)) return '/premium';
  const params = new URLSearchParams({ upgrade: planId });
  if (variantId) params.set('variant', variantId);
  return `/dashboard?${params.toString()}`;
}
