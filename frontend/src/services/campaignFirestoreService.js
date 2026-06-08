import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { db } from '../firebase/auth';
import { generateSlug, appendSlugSuffix } from '../utils/slugGenerator';
import { normalizeCampaign, addDays, toDate } from '../utils/campaignHelpers';
import { uploadBanner, uploadGalleryImages, uploadLogo } from './storageService';
import { auth } from '../firebase/auth';
import { isUserVerified, getUserProfile } from './authService';

const CAMPAIGNS = 'campaigns';

/**
 * Generate a unique slug locally — no Firestore query (avoids permission errors).
 */
export function resolveUniqueSlug(title) {
  const base = generateSlug(title) || 'campaign';
  const suffix = Date.now().toString(36).slice(-5);
  return `${base}-${suffix}`.replace(/--+/g, '-').slice(0, 80);
}

/**
 * Auto-expire campaigns past endDate (batch update).
 */
export async function expireOverdueCampaigns(campaigns) {
  const now = Date.now();
  const batch = writeBatch(db);
  let count = 0;

  campaigns.forEach((c) => {
    if (c.status === 'active' && c.endDate) {
      const end = toDate(c.endDate) || new Date(c.endDate);
      if (end && now > end.getTime()) {
        batch.update(doc(db, CAMPAIGNS, c.id), { status: 'expired', updatedAt: serverTimestamp() });
        count++;
      }
    }
  });

  if (count > 0) {
    try {
      await batch.commit();
    } catch (err) {
      console.warn('Campaign expiry sync skipped (admin permission required):', err.message);
    }
  }
  return count;
}

/**
 * Create campaign with package — status payment_pending until proof uploaded.
 */
export async function createCampaign({ form, bannerFile, logoFile, galleryFiles, ownerId, ownerName, ownerEmail, pkg, onUploadProgress }) {
  if (!bannerFile) throw new Error('Banner image is required');
  if (!pkg) throw new Error('Please select a package');
  if (!ownerId) throw new Error('You must be signed in to create a campaign');
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('You must be signed in to create a campaign');
  const profile = await getUserProfile(currentUser.uid);
  if (!isUserVerified(currentUser, profile)) {
    throw new Error('Please verify your email before launching a campaign.');
  }

  let bannerImage;
  let logoUrl = '';
  let galleryImages = [];
  try {
    onUploadProgress?.(5, 'Validating images…');

    bannerImage = await uploadBanner(bannerFile, (pct) => {
      onUploadProgress?.(Math.round(pct * 0.45), 'Uploading banner…');
    });

    if (logoFile) {
      logoUrl = await uploadLogo(logoFile, (pct) => {
        onUploadProgress?.(45 + Math.round(pct * 0.15), 'Uploading logo…');
      });
    }

    if (galleryFiles?.length) {
      galleryImages = await uploadGalleryImages(galleryFiles, (pct) => {
        onUploadProgress?.(60 + Math.round(pct * 0.35), 'Uploading gallery…');
      });
    }

    onUploadProgress?.(98, 'Saving campaign…');
  } catch (err) {
    const code = err.code || '';
    const msg = err.message || '';
    if (code === 'storage/unauthorized' || code === 'storage/unauthenticated' || msg.includes('signed in')) {
      throw new Error('Image upload failed — please sign in again and retry.');
    }
    throw err;
  }

  const slug = resolveUniqueSlug(form.title);

  const socialLinks = {
    facebook: form.socialFacebook?.trim() || '',
    twitter: form.socialTwitter?.trim() || '',
    instagram: form.socialInstagram?.trim() || '',
    website: form.socialWebsite?.trim() || '',
  };

  const campaignData = {
    title: form.title,
    slug,
    description: form.description,
    category: form.category || 'General',
    campaignType: form.campaignType || 'Awareness',
    bannerImage,
    bannerUrl: bannerImage,
    logoUrl,
    logoImage: logoUrl,
    galleryImages,
    socialLinks,
    ownerId,
    ownerName,
    ownerEmail: ownerEmail || form.contactEmail || '',
    contactEmail: form.contactEmail || ownerEmail || '',
    contactPhone: form.contactPhone || '',
    packageType: pkg.id,
    packageName: pkg.name,
    packagePrice: pkg.price,
    priorityLevel: pkg.priorityLevel,
    featured: pkg.featured || false,
    spotlight: pkg.spotlight || false,
    packageFeatured: pkg.featured || false,
    packageSpotlight: pkg.spotlight || false,
    verified: false,
    paymentVerified: false,
    views: 0,
    shares: 0,
    clicks: 0,
    durationDays: pkg.durationDays,
    duration: pkg.durationDays,
    status: pkg.price === 0 || pkg.id === 'free' ? 'pending_review' : 'payment_pending',
    startDate: null,
    endDate: null,
    expiresAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    const docRef = await addDoc(collection(db, CAMPAIGNS), campaignData);
    onUploadProgress?.(100, 'Campaign saved');
    return { id: docRef.id, ...campaignData, slug };
  } catch (err) {
    if (err.code === 'permission-denied') {
      throw new Error('Permission denied — sign in again or contact support.');
    }
    throw err;
  }
}

/**
 * Get campaign by slug.
 */
export async function getCampaignBySlug(slug) {
  const q = query(collection(db, CAMPAIGNS), where('slug', '==', slug));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return normalizeCampaign(snap.docs[0]);
}

/**
 * Fetch campaigns with optional filters (one-time read).
 */
export async function fetchCampaigns({ status, featured, category, search, sort = 'newest', limitCount = 50 } = {}) {
  let q = collection(db, CAMPAIGNS);
  const constraints = [];

  if (status) constraints.push(where('status', '==', status));
  if (featured) constraints.push(where('featured', '==', true));
  if (category) constraints.push(where('category', '==', category));

  if (sort === 'trending') {
    constraints.push(orderBy('views', 'desc'));
  } else {
    constraints.push(orderBy('createdAt', 'desc'));
  }

  const snap = await getDocs(query(q, ...constraints));
  let campaigns = snap.docs.map(normalizeCampaign);

  // Auto-expire overdue
  await expireOverdueCampaigns(campaigns);
  campaigns = campaigns.map(normalizeCampaign);

  // Filter active only for public (hide expired even if status not yet updated)
  if (status === 'active') {
    campaigns = campaigns.filter((c) => c.status === 'active' && !c.isExpired);
  }

  if (search) {
    const term = search.toLowerCase();
    campaigns = campaigns.filter(
      (c) =>
        c.title?.toLowerCase().includes(term) ||
        c.description?.toLowerCase().includes(term) ||
        c.category?.toLowerCase().includes(term)
    );
  }

  return campaigns.slice(0, limitCount);
}

/**
 * Admin: approve campaign — sets active dates.
 */
export async function approveCampaign(campaignId, durationDays = 30) {
  const ref = doc(db, CAMPAIGNS, campaignId);
  const snap = await getDoc(ref);
  const days = durationDays || snap.data()?.durationDays || 30;
  const start = new Date();
  const end = addDays(start, days);
  await updateDoc(ref, {
    status: 'active',
    startDate: Timestamp.fromDate(start),
    endDate: Timestamp.fromDate(end),
    updatedAt: serverTimestamp(),
  });
}

export async function rejectCampaign(campaignId, reason = '') {
  await updateDoc(doc(db, CAMPAIGNS, campaignId), {
    status: 'rejected',
    rejectionReason: reason,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCampaign(campaignId) {
  await deleteDoc(doc(db, CAMPAIGNS, campaignId));
}

export async function extendCampaign(campaignId, additionalDays, currentEndDate, currentDurationDays = 0) {
  const base = toDate(currentEndDate) || new Date();
  const newEnd = addDays(base, additionalDays);
  await updateDoc(doc(db, CAMPAIGNS, campaignId), {
    endDate: Timestamp.fromDate(newEnd),
    durationDays: currentDurationDays + additionalDays,
    status: 'active',
    updatedAt: serverTimestamp(),
  });
}

export async function toggleFeatured(campaignId, featured) {
  await updateDoc(doc(db, CAMPAIGNS, campaignId), {
    featured,
    updatedAt: serverTimestamp(),
  });
}

export async function toggleSpotlight(campaignId, spotlight) {
  await updateDoc(doc(db, CAMPAIGNS, campaignId), {
    spotlight,
    updatedAt: serverTimestamp(),
  });
}

export async function toggleCampaignDisabled(campaignId, disabled) {
  await updateDoc(doc(db, CAMPAIGNS, campaignId), {
    disabled,
    updatedAt: serverTimestamp(),
  });
}

export async function getCampaignStats() {
  const snap = await getDocs(collection(db, CAMPAIGNS));
  const all = snap.docs.map(normalizeCampaign);
  await expireOverdueCampaigns(all);

  const refreshed = (await getDocs(collection(db, CAMPAIGNS))).docs.map(normalizeCampaign);

  return {
    total: refreshed.length,
    active: refreshed.filter((c) => c.status === 'active' && !c.isExpired).length,
    pending: refreshed.filter((c) => ['payment_pending', 'pending_review', 'pending'].includes(c.status)).length,
    expired: refreshed.filter((c) => c.status === 'expired' || c.isExpired).length,
    totalViews: refreshed.reduce((sum, c) => sum + (c.views || 0), 0),
    totalShares: refreshed.reduce((sum, c) => sum + (c.shares || 0), 0),
  };
}

export async function getUserCampaigns(ownerId) {
  const q = query(
    collection(db, CAMPAIGNS),
    where('ownerId', '==', ownerId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(normalizeCampaign);
}

export async function incrementCampaignField(campaignId, field) {
  const ref = doc(db, CAMPAIGNS, campaignId);
  try {
    await updateDoc(ref, { [field]: increment(1), updatedAt: serverTimestamp() });
  } catch (err) {
    console.warn(`Campaign ${field} increment skipped:`, err.message);
  }
}
