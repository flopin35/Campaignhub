/** Visibility boost tiers — aligned with premium pricing */
export const BOOST_PACKAGES = [
  {
    id: 'boost-24hr',
    name: '24 Hour Boost',
    durationMs: 24 * 60 * 60 * 1000,
    price: 25,
    priority: 30,
    featured: false,
  },
  {
    id: 'boost-3day',
    name: '3 Day Boost',
    durationMs: 3 * 24 * 60 * 60 * 1000,
    price: 60,
    priority: 35,
    featured: false,
  },
  {
    id: 'boost-7day',
    name: '7 Day Featured Boost',
    durationMs: 7 * 24 * 60 * 60 * 1000,
    price: 120,
    priority: 40,
    featured: true,
  },
];

const LEGACY_BOOST_MAP = {
  'boost-2min': 'boost-24hr',
  'boost-10hr': 'boost-24hr',
  'boost-featured': 'boost-7day',
};

export function getBoostPackageById(id) {
  const resolved = LEGACY_BOOST_MAP[id] || id;
  return BOOST_PACKAGES.find((p) => p.id === resolved) || null;
}
