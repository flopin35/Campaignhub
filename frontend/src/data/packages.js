export const PAYMENT_DETAILS = {
  number: '0509002402',
  receiver: 'Cynthia Okyere',
  currency: 'GHS',
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
  BASIC: 'basic',
  BOOST: 'boost',
  PREMIUM: 'premium',
  ELITE: 'elite',
};

/** Legacy ids map to new package ids for existing Firestore docs */
export const LEGACY_PACKAGE_MAP = {
  starter: 'basic',
  standard: 'boost',
  premium: 'premium',
  elite: 'elite',
};

export const PACKAGES = [
  {
    id: 'basic',
    name: 'Basic Ad',
    price: 100,
    durationDays: 7,
    priorityLevel: 1,
    featured: false,
    spotlight: false,
    description: '7 days · Basic visibility across the platform',
    features: ['Standard card placement', '7 days live', 'Basic visibility', 'Share link & QR code'],
  },
  {
    id: 'boost',
    name: 'Boost Ad',
    price: 250,
    durationDays: 14,
    priorityLevel: 2,
    featured: false,
    spotlight: false,
    description: '14 days · Homepage visibility boost',
    features: ['Homepage listing', 'Medium banner size', '14 days live', 'Basic analytics'],
  },
  {
    id: 'premium',
    name: 'Premium Campaign',
    price: 500,
    durationDays: 30,
    priorityLevel: 3,
    featured: true,
    spotlight: false,
    description: '30 days · Featured placement',
    features: ['Featured placement', 'Large banner', '30 days live', 'Priority visibility'],
  },
  {
    id: 'elite',
    name: 'Elite Campaign',
    price: 600,
    durationDays: 45,
    priorityLevel: 4,
    featured: true,
    spotlight: true,
    description: '45 days · Top featured placement',
    features: ['Top homepage spotlight', 'Elite badge', '45 days live', 'Priority approval'],
  },
];

export function getPackageById(id) {
  const resolved = LEGACY_PACKAGE_MAP[id] || id;
  return PACKAGES.find((p) => p.id === resolved) || null;
}
