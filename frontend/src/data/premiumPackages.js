/** Premium monetization — affordable, trustworthy, pain-point driven. */

export const PREMIUM_FEATURE_IDS = {
  VISIBILITY_BOOST: 'visibility-boost',
  AI_ASSISTANT: 'ai-assistant',
  VERIFIED_BADGE: 'verified-badge',
  ADVANCED_ANALYTICS: 'advanced-analytics',
  MULTI_PLATFORM: 'multi-platform',
  GROWTH_BUNDLE: 'growth-bundle',
  COMPLETE_BUNDLE: 'complete-bundle',
};

/** Individual tool prices (for bundle math) */
export const TOOL_PRICES = {
  ai: 45,
  verified: 80,
  analytics: 70,
  multiPlatform: 55,
  boost24h: 25,
  boost3d: 60,
  boost7d: 120,
};

/** Sum: 45+80+70+55 = 250 → rounded bundle ₵249 */
export const GROWTH_BUNDLE_RAW = TOOL_PRICES.ai + TOOL_PRICES.verified + TOOL_PRICES.analytics + TOOL_PRICES.multiPlatform;
export const GROWTH_BUNDLE_PRICE = 249;

/** Sum: 250+120 = 370 → rounded bundle ₵349 */
export const COMPLETE_BUNDLE_RAW = GROWTH_BUNDLE_RAW + TOOL_PRICES.boost7d;
export const COMPLETE_BUNDLE_PRICE = 349;

export const FREE_PLAN = {
  id: 'free',
  name: 'Free Campaign',
  label: 'Free Plan',
  price: 0,
  priceLabel: '₵0',
  mainBenefit: 'Launch campaigns with everything essential — no paywall on core features.',
  features: [
    'Campaign hosting',
    'Banner uploads',
    'Share links',
    'QR code generation',
    'Basic analytics',
    'Campaign dashboard',
    'Approval system',
    'Basic AI caption generator',
  ],
};

export const PREMIUM_PACKAGES = [
  {
    id: PREMIUM_FEATURE_IDS.VISIBILITY_BOOST,
    name: 'Visibility Boost',
    label: '🔥 Visibility Boost',
    button: 'Boost Campaign',
    badge: 'Fast Growth',
    tagline: 'Get seen when it matters most',
    painPoint: 'My campaign is not getting enough visibility.',
    problem: 'Your campaign is live but not enough people are seeing it.',
    benefit: 'Reach more people with homepage spotlight and trending placement.',
    result: 'Increase campaign exposure and get more eyes on your message.',
    bestFor: 'Businesses, events, creators, politicians',
    priceFrom: 25,
    icon: 'zap',
    features: [
      'Homepage spotlight',
      'Trending placement',
      'Priority campaign ranking',
      'Increased exposure',
      'Boost badge',
    ],
    purchasable: true,
    variants: [
      { id: 'boost-24hr', label: '24 Hours', price: 25, durationMs: 24 * 60 * 60 * 1000 },
      { id: 'boost-3day', label: '3 Days', price: 60, durationMs: 3 * 24 * 60 * 60 * 1000 },
      { id: 'boost-7day', label: '7 Days', price: 120, durationMs: 7 * 24 * 60 * 60 * 1000, featured: true },
    ],
  },
  {
    id: PREMIUM_FEATURE_IDS.AI_ASSISTANT,
    name: 'AI Campaign Assistant',
    label: '🤖 AI Campaign Assistant',
    button: 'Unlock AI Tools',
    badge: 'Best For Businesses',
    tagline: 'Marketing support when you need it',
    painPoint: "I don't know how to market properly.",
    problem: 'Writing slogans, captions, and CTAs takes time and skill.',
    benefit: 'Create better marketing content in seconds with AI support.',
    result: 'Launch professional campaigns faster — even without a marketing team.',
    bestFor: 'Small businesses and creators',
    price: 45,
    priceLabel: '₵45 / month',
    durationDays: 30,
    icon: 'sparkles',
    features: [
      'AI slogans',
      'AI captions',
      'AI hashtags',
      'Campaign strategy suggestions',
      'CTA generation',
      'Posting ideas',
    ],
    purchasable: true,
  },
  {
    id: PREMIUM_FEATURE_IDS.VERIFIED_BADGE,
    name: 'Verified Campaign',
    label: '✔ Verified Campaign',
    button: 'Request Verification',
    badge: 'Recommended',
    tagline: 'Build trust instantly',
    painPoint: "People don't trust online campaigns.",
    problem: 'Online audiences are skeptical of unverified businesses and campaigns.',
    benefit: 'Build trust and credibility with a verified campaign badge.',
    result: 'Customers feel safer engaging with your campaign.',
    bestFor: 'Businesses, organizations, politicians',
    price: 80,
    priceLabel: '₵80 verification',
    durationDays: null,
    icon: 'badge',
    features: [
      'Verified badge',
      'Trust boost',
      'Better visibility',
      'Higher credibility',
      'Priority approval review',
    ],
    purchasable: true,
  },
  {
    id: PREMIUM_FEATURE_IDS.ADVANCED_ANALYTICS,
    name: 'Advanced Analytics',
    label: '📊 Advanced Analytics',
    button: 'View Insights',
    badge: null,
    tagline: 'Know what actually works',
    painPoint: "I don't know which campaigns work best.",
    problem: 'You are spending effort but cannot tell what is actually working.',
    benefit: 'Understand what works with engagement trends and performance comparison.',
    result: 'Improve campaign performance with data-driven decisions.',
    bestFor: 'Growing businesses and marketers',
    price: 70,
    priceLabel: '₵70 / month',
    durationDays: 30,
    icon: 'chart',
    features: [
      'Engagement trends',
      'Click tracking',
      'Share tracking',
      'Top campaign insights',
      'Audience activity timing',
      'Performance comparison',
    ],
    purchasable: true,
  },
  {
    id: PREMIUM_FEATURE_IDS.MULTI_PLATFORM,
    name: 'Multi-Platform Distribution',
    label: '🌍 Multi-Platform Distribution',
    button: 'Distribute Campaign',
    badge: null,
    tagline: 'One campaign, every platform',
    painPoint: 'Posting everywhere takes too much time.',
    problem: 'Creating separate posts for WhatsApp, Facebook, Instagram, and TikTok is exhausting.',
    benefit: 'Save time with optimized content generated for every platform.',
    result: 'Distribute your campaign everywhere in minutes, not hours.',
    bestFor: 'Creators, influencers, businesses',
    price: 55,
    priceLabel: '₵55 / month',
    durationDays: 30,
    icon: 'share',
    features: [
      'WhatsApp campaign format',
      'Facebook optimized copy',
      'Instagram optimized copy',
      'TikTok optimized copy',
      'Multi-platform captions',
    ],
    purchasable: true,
  },
];

export const BUNDLE_PACKAGES = [
  {
    id: PREMIUM_FEATURE_IDS.GROWTH_BUNDLE,
    name: 'Growth Toolkit',
    label: 'Growth Toolkit Bundle',
    button: 'Get Growth Bundle',
    badge: 'Best For Growing Businesses',
    tagline: 'All core premium tools in one simple payment',
    painPoint: 'I need multiple tools but want one simple upgrade.',
    problem: 'Managing marketing, trust, and analytics separately is expensive and confusing.',
    benefit: 'One bundle unlocks AI, verification, analytics, and multi-platform tools.',
    result: 'Grow faster with a professional campaign setup — without juggling multiple payments.',
    bestFor: 'Businesses ready to grow',
    price: GROWTH_BUNDLE_PRICE,
    priceLabel: `₵${GROWTH_BUNDLE_PRICE}`,
    originalPrice: GROWTH_BUNDLE_RAW,
    durationDays: 30,
    icon: 'bundle',
    features: [
      'AI Campaign Assistant (30 days)',
      'Verified Campaign Badge',
      'Advanced Analytics (30 days)',
      'Multi-Platform Distribution (30 days)',
    ],
    includes: [
      PREMIUM_FEATURE_IDS.AI_ASSISTANT,
      PREMIUM_FEATURE_IDS.VERIFIED_BADGE,
      PREMIUM_FEATURE_IDS.ADVANCED_ANALYTICS,
      PREMIUM_FEATURE_IDS.MULTI_PLATFORM,
    ],
    purchasable: true,
    isBundle: true,
  },
  {
    id: PREMIUM_FEATURE_IDS.COMPLETE_BUNDLE,
    name: 'Complete Campaign Pro',
    label: 'Complete Campaign Pro',
    button: 'Get Complete Pro',
    badge: 'Most Popular',
    tagline: 'Maximum visibility plus every growth tool',
    painPoint: 'I want the full CampaignHub advantage.',
    problem: 'Launching a serious campaign requires visibility, trust, content, and insights all at once.',
    benefit: '7-day boost plus every premium tool in one package.',
    result: 'Maximum exposure and professional campaign power from day one.',
    bestFor: 'Serious campaigns and launches',
    price: COMPLETE_BUNDLE_PRICE,
    priceLabel: `₵${COMPLETE_BUNDLE_PRICE}`,
    originalPrice: COMPLETE_BUNDLE_RAW,
    durationDays: 30,
    icon: 'bundle',
    features: [
      '7-Day Visibility Boost',
      'AI Campaign Assistant (30 days)',
      'Verified Campaign Badge',
      'Advanced Analytics (30 days)',
      'Multi-Platform Distribution (30 days)',
    ],
    includes: [
      PREMIUM_FEATURE_IDS.VISIBILITY_BOOST,
      PREMIUM_FEATURE_IDS.AI_ASSISTANT,
      PREMIUM_FEATURE_IDS.VERIFIED_BADGE,
      PREMIUM_FEATURE_IDS.ADVANCED_ANALYTICS,
      PREMIUM_FEATURE_IDS.MULTI_PLATFORM,
    ],
    boostVariantId: 'boost-7day',
    purchasable: true,
    isBundle: true,
  },
];

/** Extended hosting — moved from upload tiers, rounded for trust */
export const HOSTING_PACKAGES = [
  {
    id: 'hosting-basic',
    name: 'Extended Basic',
    price: 99,
    priceLabel: '₵99',
    durationDays: 7,
    priorityLevel: 1,
    featured: false,
    spotlight: false,
    mainBenefit: '7 extra days of standard visibility',
    features: ['Standard card placement', '7 days live', 'Priority listing', 'Share link & QR code'],
    purchasable: true,
    purchaseType: 'hosting',
  },
  {
    id: 'hosting-boost',
    name: 'Extended Boost',
    price: 249,
    priceLabel: '₵249',
    durationDays: 14,
    priorityLevel: 2,
    featured: false,
    spotlight: false,
    mainBenefit: '14 days with homepage visibility',
    features: ['Homepage listing', 'Medium banner size', '14 days live', 'Extended reach'],
    purchasable: true,
    purchaseType: 'hosting',
  },
  {
    id: 'hosting-premium',
    name: 'Extended Premium',
    price: 499,
    priceLabel: '₵499',
    durationDays: 30,
    priorityLevel: 3,
    featured: true,
    spotlight: false,
    badge: 'Best For Businesses',
    mainBenefit: '30 days featured placement',
    features: ['Featured placement', 'Large banner', '30 days live', 'Priority visibility'],
    purchasable: true,
    purchaseType: 'hosting',
  },
  {
    id: 'hosting-elite',
    name: 'Extended Elite',
    price: 599,
    priceLabel: '₵599',
    durationDays: 45,
    priorityLevel: 4,
    featured: true,
    spotlight: true,
    badge: 'Fast Growth',
    mainBenefit: '45 days top spotlight placement',
    features: ['Top homepage spotlight', 'Elite badge', '45 days live', 'Priority approval'],
    purchasable: true,
    purchaseType: 'hosting',
  },
];

/** All purchasable plans for upgrade panel */
export const ALL_PREMIUM_PLANS = [...BUNDLE_PACKAGES, ...PREMIUM_PACKAGES];

export function getPremiumPackageById(id) {
  return PREMIUM_PACKAGES.find((p) => p.id === id) || BUNDLE_PACKAGES.find((p) => p.id === id) || null;
}

export function getHostingPackageById(id) {
  return HOSTING_PACKAGES.find((p) => p.id === id) || null;
}

export function getPurchasablePlan(id) {
  return getPremiumPackageById(id) || getHostingPackageById(id) || null;
}

export function getPremiumVariant(featureId, variantId) {
  const pkg = PREMIUM_PACKAGES.find((p) => p.id === featureId);
  if (!pkg?.variants) return null;
  return pkg.variants.find((v) => v.id === variantId) || null;
}

export function formatPrice(amount) {
  return `₵${amount}`;
}
