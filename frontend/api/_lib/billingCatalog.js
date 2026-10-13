/**
 * CampaignHub billing catalog — the single source of truth for prices.
 * Imported by the serverless billing API (amounts are never trusted from the browser)
 * and by the React app (pricing pages, checkout buttons).
 *
 * All amounts are in Ghana cedis (GHS). Paystack expects pesewas (×100).
 */

export const CURRENCY = 'GHS';
export const TRIAL_DAYS = 7;
/** Public page stays live this many days after a paid period ends, so supporters never hit a dead link mid-renewal. */
export const GRACE_DAYS = 3;

export const PRO_PLANS = {
  monthly: {
    id: 'pro-monthly',
    product: 'pro',
    cycle: 'monthly',
    name: 'CampaignHub Pro — Monthly',
    shortName: 'Monthly',
    amount: 120,
    days: 30,
    per: 'month',
  },
  yearly: {
    id: 'pro-yearly',
    product: 'pro',
    cycle: 'yearly',
    name: 'CampaignHub Pro — Yearly',
    shortName: 'Yearly',
    amount: 1200,
    days: 365,
    per: 'year',
    savingsLabel: '2 months free',
    savingsAmount: 120 * 12 - 1200,
  },
};

/** On-platform ad placements (homepage + directory spotlight). One-time purchases. */
export const SPOTLIGHT_PACKAGES = [
  { id: 'boost-3hr', name: '3-hour Spotlight', label: '3 hours', durationMs: 3 * 3600000, amount: 20, priority: 20, featured: false },
  { id: 'boost-6hr', name: '6-hour Spotlight', label: '6 hours', durationMs: 6 * 3600000, amount: 50, priority: 25, featured: false },
  { id: 'boost-12hr', name: '12-hour Spotlight', label: '12 hours', durationMs: 12 * 3600000, amount: 100, priority: 30, featured: false },
  { id: 'boost-24hr', name: '24-hour Spotlight', label: '24 hours', durationMs: 24 * 3600000, amount: 200, priority: 40, featured: false, popular: true },
  { id: 'boost-48hr', name: '48-hour Spotlight', label: '48 hours', durationMs: 48 * 3600000, amount: 350, priority: 50, featured: true },
];

export const PROVIDERS = {
  paystack: { id: 'paystack', name: 'Paystack', methods: 'MoMo, Visa, Mastercard' },
  flutterwave: { id: 'flutterwave', name: 'Flutterwave', methods: 'MoMo, Visa, Mastercard' },
};

export function getProPlan(cycle) {
  return PRO_PLANS[cycle] || null;
}

export function getSpotlightPackage(id) {
  return SPOTLIGHT_PACKAGES.find((p) => p.id === id) || null;
}

/** Resolve what is being bought → { name, amount, days?, durationMs? } or null. */
export function resolveProduct({ product, cycle, variantId }) {
  if (product === 'pro') {
    const plan = getProPlan(cycle);
    return plan ? { ...plan } : null;
  }
  if (product === 'spotlight') {
    const pkg = getSpotlightPackage(variantId);
    return pkg ? { ...pkg, product: 'spotlight' } : null;
  }
  return null;
}

export function formatCedis(amount) {
  const n = Number(amount || 0);
  return `₵${n.toLocaleString('en-GH', { maximumFractionDigits: 2 })}`;
}
