import { generateSlug, appendSlugSuffix } from '../utils/slugGenerator.js';
import { getDb, isFirebaseConfigured } from '../config/firebaseConfig.js';
import { mockCampaigns } from './firebaseService.js';

const COLLECTION = 'campaigns';

/**
 * Resolve a unique slug for a campaign title.
 * Checks Firestore (or mock store) for collisions.
 */
export async function resolveUniqueSlug(title) {
  const baseSlug = generateSlug(title);

  if (!isFirebaseConfigured()) {
    const existing = mockCampaigns.filter((c) => c.slug.startsWith(baseSlug));
    if (existing.length === 0) return baseSlug;
    return appendSlugSuffix(baseSlug, existing.length);
  }

  const db = getDb();
  const snapshot = await db
    .collection(COLLECTION)
    .where('slug', '>=', baseSlug)
    .where('slug', '<=', baseSlug + '\uf8ff')
    .get();

  const matchingSlugs = snapshot.docs.map((doc) => doc.data().slug);

  if (!matchingSlugs.includes(baseSlug)) return baseSlug;

  let count = matchingSlugs.length;
  let candidate = appendSlugSuffix(baseSlug, count);
  while (matchingSlugs.includes(candidate)) {
    count++;
    candidate = appendSlugSuffix(baseSlug, count);
  }
  return candidate;
}
