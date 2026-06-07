import { FREE_PLAN as PREMIUM_FREE_PLAN } from './premiumPackages';

export const PAYMENT_DETAILS = {
  network: 'Telecel Cash',
  number: '0509002402',
  receiver: 'Cynthia Okyere',
  currency: 'GHS',
  supportEmail: 'campaignhubgh@gmail.com',
};

export const CAMPAIGN_STATUSES = {
  PAYMENT_PENDING: 'payment_pending',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  ACTIVE: 'active',
  EXPIRED: 'expired',
  REJECTED: 'rejected',
};

export const PACKAGE_IDS = {
  FREE: 'free',
  BASIC: 'basic',
  BOOST: 'boost',
  PREMIUM: 'premium',
  ELITE: 'elite',
};

export const LEGACY_PACKAGE_MAP = {
  starter: 'basic',
  standard: 'boost',
  premium: 'premium',
  elite: 'elite',
  'hosting-basic': 'basic',
  'hosting-boost': 'boost',
  'hosting-premium': 'premium',
  'hosting-elite': 'elite',
};

/** Upload flow — free only; paid hosting lives on Premium page */
export const PACKAGES = [
  {
    ...PREMIUM_FREE_PLAN,
    durationDays: 14,
    priorityLevel: 0,
    featured: false,
    spotlight: false,
    isFree: true,
    description: '14 days · Everything you need to launch',
  },
];

/** Legacy paid tiers for existing Firestore docs */
export const LEGACY_PAID_PACKAGES = {
  basic: { id: 'basic', name: 'Basic Ad', price: 99, durationDays: 7, priorityLevel: 1, featured: false, spotlight: false },
  boost: { id: 'boost', name: 'Boost Ad', price: 249, durationDays: 14, priorityLevel: 2, featured: false, spotlight: false },
  premium: { id: 'premium', name: 'Premium Campaign', price: 499, durationDays: 30, priorityLevel: 3, featured: true, spotlight: false },
  elite: { id: 'elite', name: 'Elite Campaign', price: 599, durationDays: 45, priorityLevel: 4, featured: true, spotlight: true },
};

export function getPackageById(id) {
  const resolved = LEGACY_PACKAGE_MAP[id] || id;
  const pkg = PACKAGES.find((p) => p.id === resolved);
  if (pkg) return pkg;
  return LEGACY_PAID_PACKAGES[resolved] || null;
}

export function isFreePackage(pkg) {
  return pkg?.isFree || pkg?.price === 0 || pkg?.id === 'free';
}
