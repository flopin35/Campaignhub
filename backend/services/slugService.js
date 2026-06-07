import { generateSlug, appendSlugSuffix } from '../utils/slugGenerator.js';
import { getDb, isFirebaseConfigured } from '../config/firebaseConfig.js';

const COLLECTION = 'campaigns';

/**
 * Resolve a unique slug for a campaign title.
 */
export async function resolveUniqueSlug(title) {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase Admin is not configured — cannot generate slug');
  }

  const baseSlug = generateSlug(title);
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
