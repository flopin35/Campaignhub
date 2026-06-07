import { Timestamp } from 'firebase/firestore';

/**
 * Normalize Firestore campaign document for UI consumption.
 */
export function normalizeCampaign(docSnap) {
  const data = docSnap.data();
  const id = docSnap.id;

  const startDate = toDate(data.startDate);
  const endDate = toDate(data.endDate);
  const createdAt = toDate(data.createdAt);

  const remainingMs = endDate ? Math.max(0, endDate.getTime() - Date.now()) : null;
  const isExpired = endDate ? Date.now() > endDate.getTime() : false;

  const boostExpiresAt = toDate(data.boostExpiresAt);
  const boostRemainingMs = boostExpiresAt ? Math.max(0, boostExpiresAt.getTime() - Date.now()) : null;
  const boostActive = !!(data.boostActive && boostExpiresAt && boostRemainingMs > 0);

  return {
    id,
    ...data,
    bannerUrl: data.bannerImage || data.bannerUrl || '',
    bannerImage: data.bannerImage || data.bannerUrl || '',
    galleryImages: data.galleryImages || [],
    startDate: startDate?.toISOString() || null,
    endDate: endDate?.toISOString() || null,
    expiryDate: endDate?.toISOString() || null,
    createdAt: createdAt?.toISOString() || null,
    remainingMs,
    isExpired,
    views: data.views || 0,
    clicks: data.clicks || 0,
    shares: data.shares || 0,
    followerCount: data.followerCount || 0,
    commentCount: data.commentCount || 0,
    extensionPending: data.extensionPending || false,
    featured: data.featured || false,
    spotlight: data.spotlight || false,
    verified: data.verified || data.paymentVerified || false,
    paymentVerified: data.paymentVerified || false,
    packageType: data.packageType || '',
    packageName: data.packageName || '',
    packagePrice: data.packagePrice || data.amount || null,
    campaignType: data.campaignType || '',
    logoUrl: data.logoUrl || data.logoImage || '',
    logoImage: data.logoUrl || data.logoImage || '',
    socialLinks: data.socialLinks || {},
    priorityLevel: data.priorityLevel || 1,
    packageFeatured: data.packageFeatured ?? data.featured ?? false,
    packageSpotlight: data.packageSpotlight ?? data.spotlight ?? false,
    featuredFromBoost: data.featuredFromBoost || false,
    boostActive,
    boostType: data.boostType || null,
    boostName: data.boostName || null,
    boostPriority: data.boostPriority || 0,
    boostExpiresAt: boostExpiresAt?.toISOString() || null,
    boostRemainingMs: boostActive ? boostRemainingMs : null,
    disabled: data.disabled || false,
    status: isExpired && data.status === 'active' ? 'expired' : data.status,
  };
}

export function isBoostActive(campaign) {
  if (!campaign?.boostActive) return false;
  if (!campaign.boostExpiresAt) return false;
  const expires = toDate(campaign.boostExpiresAt) || new Date(campaign.boostExpiresAt);
  return expires && Date.now() < expires.getTime();
}

/** Sort for homepage / listings: boosted → featured → package priority → newest */
export function sortCampaignsForDisplay(campaigns) {
  return [...campaigns].sort((a, b) => {
    const boostA = isBoostActive(a) ? (a.boostPriority || 0) : 0;
    const boostB = isBoostActive(b) ? (b.boostPriority || 0) : 0;
    if (boostB !== boostA) return boostB - boostA;

    const featA = (a.featured ? 1 : 0) + (a.spotlight ? 1 : 0);
    const featB = (b.featured ? 1 : 0) + (b.spotlight ? 1 : 0);
    if (featB !== featA) return featB - featA;

    const priDiff = (b.priorityLevel || 0) - (a.priorityLevel || 0);
    if (priDiff !== 0) return priDiff;

    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });
}

export function getStatusLabel(status) {
  const labels = {
    payment_pending: 'Payment Pending',
    pending_review: 'Pending Approval',
    pending_payment_review: 'Pending Approval',
    approved: 'Approved',
    active: 'Active',
    expired: 'Expired',
    rejected: 'Rejected',
    pending: 'Pending',
    disabled: 'Disabled',
  };
  return labels[status] || status;
}

export function getStatusBadgeClass(status) {
  const map = {
    active: 'badge-active',
    payment_pending: 'badge-pending',
    pending_review: 'badge-pending',
    approved: 'badge-pending',
    pending: 'badge-pending',
    expired: 'badge-expired',
    rejected: 'badge-expired',
    disabled: 'badge-expired',
  };
  return map[status] || 'badge-pending';
}

export function toDate(value) {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  if (value?.seconds) return new Date(value.seconds * 1000);
  return null;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isCampaignVisible(campaign) {
  return campaign.status === 'active' && !campaign.isExpired && !campaign.disabled;
}

export const CAMPAIGN_TYPES = ['Political', 'Business', 'Awareness', 'Event'];

export const CATEGORIES = [
  'Politics',
  'Business',
  'NGO',
  'Events',
  'Education',
  'Religion',
  'Entertainment',
  'General',
];
