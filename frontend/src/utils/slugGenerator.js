/**
 * Generate URL-friendly slug from title.
 */
export function generateSlug(title) {
  if (!title) return 'campaign';
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'campaign';
}

export function appendSlugSuffix(base, count) {
  if (count <= 0) return base;
  return count === 1 ? `${base}-2` : `${base}-${count + 1}`;
}
