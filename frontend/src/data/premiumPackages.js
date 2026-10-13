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
  name: 'Free Campaign Page',
  label: 'Free',
  price: 0,
  priceLabel: '₵0',
  mainBenefit: 'Launch an official campaign page with your message, link, and QR code.',
  features: [
    'Official campaign page hosting',
    'Banner and party logo',
    'Official campaign link',
    'Official campaign QR code',
    'My Campaign Pages',
  ],
};

/** Everything except ad boost — one subscription */
export const SUBSCRIPTION_PACKAGE = {
  id: PREMIUM_FEATURE_IDS.PREMIUM_SUBSCRIPTION,
  name: 'CampaignHub Premium',
  label: 'CampaignHub Premium',
  button: 'Subscribe — ₵500',
  badge: 'Official presence',
  tagline: 'Authorization review, hosting & directory presence',
  painPoint: '',
  problem: '',
  benefit: 'One ₵500 subscription supports admin authorization review, extended official presence, and directory visibility.',
  result: 'A trusted official campaign home with a single payment and one reference.',
  bestFor: 'Candidates, parties, and constituency campaigns',
  price: SUBSCRIPTION_PRICE,
  priceLabel: `₵${SUBSCRIPTION_PRICE} / month`,
  durationDays: 30,
  icon: 'bundle',
  /** Public marketing bullets — presence only (entitlements still unlock owner tools). */
  features: [
    'Admin authorization review path',
    'Official Page badge eligibility (admin review required)',
    'Extended official presence (30 days)',
    'Priority directory visibility',
    'One payment · one reference',
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

/** Directory spotlight — separate from subscription */
export const PREMIUM_PACKAGES = [
  {
    id: PREMIUM_FEATURE_IDS.VISIBILITY_BOOST,
    name: 'Directory Spotlight',
    label: 'Directory Spotlight',
    button: 'Spotlight campaign page',
    badge: 'Directory placement',
    tagline: 'Help citizens find your official page',
    painPoint: '',
    problem: '',
    benefit: 'Appear in homepage and directory placement so citizens can find your official page.',
    result: 'More citizens reach your official campaign page and message.',
    bestFor: 'Candidates, parties, and constituency campaigns',
    priceFrom: boostRange.min,
    icon: 'zap',
    features: [
      'Homepage placement',
      'Directory priority placement',
      'Time-limited spotlight',
    ],
    purchasable: true,
    variants: getBoostVariantsForPremium(),
  },
];

/** Public Premium page — presence pillars only (not CRM/AI sales grid) */
export const PREMIUM_INCLUDED_FEATURES = [
  {
    id: PREMIUM_FEATURE_IDS.VERIFIED_BADGE,
    name: 'Admin authorization',
    label: 'Admin authorization',
    tagline: 'Request review for the Official Page badge',
    priceLabel: 'Included',
    features: ['Authorization review request', 'Official Page badge if approved', 'Public trust signal'],
  },
  {
    id: 'presence-hosting',
    name: 'Extended hosting',
    label: 'Extended hosting',
    tagline: 'Keep your official page live through the campaign period',
    priceLabel: 'Included',
    features: ['30-day presence window', 'Official link & QR stay live', 'Election-period continuity'],
  },
  {
    id: 'presence-directory',
    name: 'Directory presence',
    label: 'Directory presence',
    tagline: 'Help citizens find your official campaign page',
    priceLabel: 'Included',
    features: ['Public directory listing', 'Office-level browsing', 'Clear official home'],
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
    name: 'Extended Presence (14 days)',
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
    name: 'Extended Presence (30 days)',
    price: SUBSCRIPTION_PRICE,
    priceLabel: `₵${SUBSCRIPTION_PRICE}`,
    durationDays: 30,
    priorityLevel: 3,
    featured: true,
    spotlight: false,
    badge: 'Directory presence',
    mainBenefit: '30 days priority directory placement',
    features: ['Priority directory placement', 'Large banner', '30 days live', 'Official page continuity'],
    purchasable: true,
    purchaseType: 'hosting',
  },
  {
    id: 'hosting-elite',
    name: 'Extended Presence (45 days)',
    price: SUBSCRIPTION_PRICE,
    priceLabel: `₵${SUBSCRIPTION_PRICE}`,
    durationDays: 45,
    priorityLevel: 4,
    featured: true,
    spotlight: true,
    badge: 'Homepage placement',
    mainBenefit: '45 days top homepage placement',
    features: ['Top homepage placement', '45 days live', 'Priority review'],
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
