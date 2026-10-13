/** Directory spotlight tiers — homepage placement & priority ranking (IDs unchanged for payments) */
export const BOOST_PACKAGES = [
  {
    id: 'boost-3hr',
    name: '3 Hour Spotlight',
    label: '3 Hours',
    durationMs: 3 * 60 * 60 * 1000,
    price: 20,
    priority: 20,
    featured: false,
    tagline: 'Short directory placement',
  },
  {
    id: 'boost-6hr',
    name: '6 Hour Spotlight',
    label: '6 Hours',
    durationMs: 6 * 60 * 60 * 1000,
    price: 50,
    priority: 25,
    featured: false,
    tagline: 'Half-day directory placement',
  },
  {
    id: 'boost-12hr',
    name: '12 Hour Spotlight',
    label: '12 Hours',
    durationMs: 12 * 60 * 60 * 1000,
    price: 100,
    priority: 30,
    featured: false,
    tagline: 'Full-day directory placement',
  },
  {
    id: 'boost-24hr',
    name: '24 Hour Spotlight',
    label: '24 Hours',
    durationMs: 24 * 60 * 60 * 1000,
    price: 200,
    priority: 40,
    featured: false,
    popular: true,
    tagline: 'Often chosen for full-day placement',
  },
  {
    id: 'boost-48hr',
    name: '48 Hour Spotlight',
    label: '48 Hours',
    durationMs: 48 * 60 * 60 * 1000,
    price: 350,
    priority: 50,
    featured: true,
    tagline: 'Extended homepage placement',
  },
];

const LEGACY_BOOST_MAP = {
  'boost-2min': 'boost-3hr',
  'boost-10hr': 'boost-12hr',
  'boost-3day': 'boost-48hr',
  'boost-7day': 'boost-48hr',
  'boost-featured': 'boost-48hr',
};

export function getBoostPackageById(id) {
  const resolved = LEGACY_BOOST_MAP[id] || id;
  return BOOST_PACKAGES.find((p) => p.id === resolved) || null;
}

/** Shape used by premium modal / package cards */
export function getBoostVariantsForPremium() {
  return BOOST_PACKAGES.map(({ id, label, price, durationMs, featured, popular, tagline }) => ({
    id,
    label,
    price,
    durationMs,
    featured,
    popular,
    tagline,
  }));
}

export function getBoostPriceRange() {
  const prices = BOOST_PACKAGES.map((p) => p.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
