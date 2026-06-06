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
    status: isExpired && data.status === 'active' ? 'expired' : data.status,
  };
}

export function getStatusLabel(status) {
  const labels = {
    payment_pending: 'Payment Pending',
    pending_review: 'Pending Review',
    approved: 'Approved',
    active: 'Active',
    expired: 'Expired',
    rejected: 'Rejected',
    pending: 'Pending',
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
  return campaign.status === 'active' && !campaign.isExpired;
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
