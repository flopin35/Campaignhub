/** Time-limited visibility boosts (admin-activated or future paid add-on). */
export const BOOST_PACKAGES = [
  {
    id: 'boost-2min',
    name: '2 Minute Boost',
    durationMs: 2 * 60 * 1000,
    price: 10,
    priority: 10,
    featured: false,
  },
  {
    id: 'boost-10hr',
    name: '10 Hour Boost',
    durationMs: 10 * 60 * 60 * 1000,
    price: 50,
    priority: 20,
    featured: false,
  },
  {
    id: 'boost-24hr',
    name: '24 Hour Boost',
    durationMs: 24 * 60 * 60 * 1000,
    price: 80,
    priority: 30,
    featured: false,
  },
  {
    id: 'boost-featured',
    name: 'Featured Placement',
    durationMs: 7 * 24 * 60 * 60 * 1000,
    price: 120,
    priority: 40,
    featured: true,
  },
];

export function getBoostPackageById(id) {
  return BOOST_PACKAGES.find((p) => p.id === id) || null;
}
