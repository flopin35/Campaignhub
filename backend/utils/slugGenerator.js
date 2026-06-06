/**
 * Generate a URL-friendly slug from campaign title.
 * Example: "Campaign Hub Launch 2026!" → "campaign-hub-launch-2026"
 */
export function generateSlug(title) {
  if (!title || typeof title !== 'string') return 'campaign';

  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'campaign';
}

/**
 * Append numeric suffix for duplicate slugs.
 * campaign-name → campaign-name-2 → campaign-name-3
 */
export function appendSlugSuffix(baseSlug, existingCount) {
  if (existingCount <= 0) return baseSlug;
  if (existingCount === 1) return `${baseSlug}-2`;
  return `${baseSlug}-${existingCount + 1}`;
}
