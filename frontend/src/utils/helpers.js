/**
 * Format remaining milliseconds into a human-readable countdown string.
 */
export function formatCountdown(remainingMs) {
  if (remainingMs == null) return 'Not started';
  if (remainingMs <= 0) return 'Expired';

  const days = Math.floor(remainingMs / 86400000);
  const hours = Math.floor((remainingMs % 86400000) / 3600000);
  const minutes = Math.floor((remainingMs % 3600000) / 60000);

  if (days > 0) return `${days} days remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

/**
 * Format ISO date string to readable format.
 */
export function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get status badge CSS class.
 */
export function getStatusBadgeClass(status) {
  const map = {
    active: 'badge-active',
    payment_pending: 'badge-pending',
    pending_review: 'badge-pending',
    approved: 'badge-pending',
    pending: 'badge-pending',
    expired: 'badge-expired',
    rejected: 'badge-expired',
  };
  return map[status] || 'badge-pending';
}

/**
 * Build full campaign public URL.
 */
export function getCampaignUrl(slug) {
  return `${window.location.origin}/campaign/${slug}`;
}
