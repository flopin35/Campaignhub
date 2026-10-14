import {
  collection,
  doc,
  addDoc,
  setDoc,
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
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/auth';
import { generateSlug, appendSlugSuffix } from '../utils/slugGenerator';
import { normalizeCampaign, addDays, toDate, sortCampaignsForDisplay, normalizeSocialLinks } from '../utils/campaignHelpers';
import { uploadBanner, uploadLogo } from './storageService';
import { auth, isAdmin } from '../firebase/auth';
import { isUserVerified, getUserProfile } from './authService';
import { getBillingConfig, serverNow, cancelAutoRenew } from './billingService';
import { disconnectMeta } from './metaService';

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

const DAY_MS = 86400000;
const TRIAL_MS = 7 * DAY_MS - 60_000;
const GRACE_MS = 3 * DAY_MS;

/** Fields an owner may edit at any time (mirrors ownerCanEditContent() in firestore.rules). */
export const OWNER_EDITABLE_FIELDS = [
  'title',
  'description',
  'bannerImage',
  'bannerUrl',
  'logoUrl',
  'logoImage',
  'galleryImages',
  'socialLinks',
  'contactEmail',
  'contactPhone',
  'campaignType',
  'category',
  'candidateName',
  'party',
  'region',
  'constituency',
  'slogan',
  'priorities',
  'electionDate',
  'voteTarget',
  'registeredVoters',
  'themeColor',
  'donation',
  'poll',
  'sections',
  'electionCandidates',
  'ownerName',
];

function cleanPriorities(list = []) {
  return (Array.isArray(list) ? list : [])
    .map((p) => ({ title: String(p?.title || '').trim().slice(0, 80), text: String(p?.text || '').trim().slice(0, 400) }))
    .filter((p) => p.title)
    .slice(0, 6);
}

/**
 * Create a campaign page.
 *  - useTrial → live immediately with a 7-day Pro trial (one per account, enforced by rules)
 *  - otherwise → saved unpublished until the owner subscribes
 */
export async function createCampaign({ form, bannerFile, logoFile, owner, useTrial, onUploadProgress }) {
  const currentUser = auth.currentUser;
  if (!currentUser || !owner?.uid || currentUser.uid !== owner.uid) {
    throw new Error('You must be signed in to create a campaign page.');
  }
  const profile = await getUserProfile(currentUser.uid);
  if (!isUserVerified(currentUser, profile)) {
    throw new Error('Verify your email before launching a campaign page.');
  }
  await currentUser.getIdToken(true);

  let bannerImage = '';
  let logoUrl = '';
  try {
    if (bannerFile) {
      onUploadProgress?.(5, 'Uploading banner…');
      bannerImage = await uploadBanner(bannerFile, (pct) => onUploadProgress?.(5 + Math.round(pct * 0.6), 'Uploading banner…'), { skipCooldown: true });
    }
    if (logoFile) {
      logoUrl = await uploadLogo(logoFile, (pct) => onUploadProgress?.(65 + Math.round(pct * 0.25), 'Uploading logo…'), { skipCooldown: true });
    }
  } catch (err) {
    const code = err.code || '';
    if (code === 'storage/unauthorized' || code === 'storage/unauthenticated') {
      throw new Error('Image upload failed — please sign in again and retry.');
    }
    throw err;
  }
  onUploadProgress?.(94, 'Saving campaign…');

  if (useTrial) await getBillingConfig().catch(() => null); // syncs clock with the server for the trial dates
  const now = serverNow();
  const ref = doc(collection(db, CAMPAIGNS));
  const title = (form.title || form.candidateName || 'Campaign').trim();
  const slug = resolveUniqueSlug(title);

  const base = {
    title,
    slug,
    description: (form.description || '').trim(),
    candidateName: (form.candidateName || owner.name || '').trim(),
    party: (form.party || '').trim(),
    campaignType: form.campaignType || 'Parliamentary',
    category: 'Politics',
    region: form.region || '',
    constituency: (form.constituency || '').trim(),
    slogan: (form.slogan || '').trim(),
    electionDate: form.electionDate || '',
    voteTarget: Number(form.voteTarget) || 0,
    registeredVoters: Number(form.registeredVoters) || 0,
    priorities: cleanPriorities(form.priorities),
    themeColor: form.themeColor || '#0f2747',
    bannerImage,
    bannerUrl: bannerImage,
    logoUrl,
    logoImage: logoUrl,
    galleryImages: [],
    socialLinks: normalizeSocialLinks(form.socialLinks || {}),
    contactEmail: form.contactEmail || owner.email || '',
    contactPhone: form.contactPhone || '',
    sections: { volunteer: true, donate: false, events: true, poll: false },
    ownerId: owner.uid,
    ownerName: owner.name || '',
    billingVersion: 2,
    verified: false,
    paymentVerified: false,
    featured: false,
    spotlight: false,
    priorityLevel: 1,
    views: 0,
    shares: 0,
    clicks: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const batch = writeBatch(db);
  if (useTrial) {
    const trialEndsAt = new Date(now + TRIAL_MS);
    const endDate = new Date(now + TRIAL_MS + GRACE_MS);
    batch.set(ref, {
      ...base,
      packageType: 'trial',
      packageName: 'Free trial',
      packagePrice: 0,
      status: 'active',
      startDate: Timestamp.fromDate(new Date(now)),
      trialEndsAt: Timestamp.fromDate(trialEndsAt),
      endDate: Timestamp.fromDate(endDate),
      expiresAt: Timestamp.fromDate(endDate),
      durationDays: 10,
    });
    batch.set(doc(db, 'users', owner.uid), {
      trialCampaignId: ref.id,
      trialStartedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } else {
    batch.set(ref, {
      ...base,
      packageType: 'pro',
      packageName: 'CampaignHub Pro',
      packagePrice: 0,
      status: 'payment_pending',
      startDate: null,
      endDate: null,
      expiresAt: null,
      durationDays: 0,
    });
  }

  try {
    await batch.commit();
  } catch (err) {
    if (err.code === 'permission-denied') {
      const profileNow = await getUserProfile(currentUser.uid).catch(() => null);
      throw new Error(useTrial && profileNow?.trialCampaignId
        ? 'Your free trial has already been used on this account. Create the page and subscribe to publish it.'
        : useTrial
          ? 'We couldn’t start your free trial. Check that your phone’s date and time are set automatically, then try again.'
          : 'Permission denied — sign out, sign in again and retry.');
    }
    throw err;
  }
  onUploadProgress?.(100, 'Done');
  return { id: ref.id, slug, ...base, packageType: useTrial ? 'trial' : 'pro' };
}

/** Start the account's one free trial on an existing (legacy or unpaid) campaign page. */
export async function startTrialForCampaign(campaign, uid) {
  if (!campaign?.id || !uid) throw new Error('Missing campaign');
  if (campaign.disabled || ['suspended', 'rejected', 'deleted'].includes(campaign.status)) {
    throw new Error('This page is on hold. Contact support to reactivate it.');
  }
  await auth.currentUser?.getIdToken(true);
  await getBillingConfig().catch(() => null);
  const now = serverNow();
  const trialEndsAt = new Date(now + TRIAL_MS);
  const trialPublicUntil = now + TRIAL_MS + GRACE_MS;
  const existingEnd = toDate(campaign.endDate)?.getTime() || 0;
  const patch = {
    packageType: 'trial',
    packageName: 'Free trial',
    status: 'active',
    startDate: Timestamp.fromDate(new Date(now)),
    trialEndsAt: Timestamp.fromDate(trialEndsAt),
    updatedAt: serverTimestamp(),
  };
  // Never shorten hosting a legacy customer already paid for: leave a later end date untouched.
  if (existingEnd <= trialPublicUntil) {
    patch.endDate = Timestamp.fromDate(new Date(trialPublicUntil));
    patch.expiresAt = patch.endDate;
  }
  const batch = writeBatch(db);
  batch.update(doc(db, CAMPAIGNS, campaign.id), patch);
  batch.set(doc(db, 'users', uid), {
    trialCampaignId: campaign.id,
    trialStartedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
  try {
    await batch.commit();
  } catch (err) {
    if (err.code === 'permission-denied') {
      const profile = await getUserProfile(uid).catch(() => null);
      throw new Error(profile?.trialCampaignId
        ? 'Your account has already used its free trial. Choose a plan to continue.'
        : 'We couldn’t start your free trial. Check that your device’s date and time are set automatically, verify your email, then try again.');
    }
    throw err;
  }
}

/** Owner edits to page content / campaign settings (whitelisted fields only). */
export async function updateCampaignContent(campaignId, patch) {
  const clean = {};
  Object.entries(patch || {}).forEach(([k, v]) => {
    if (OWNER_EDITABLE_FIELDS.includes(k) && v !== undefined) clean[k] = v;
  });
  if (clean.priorities) clean.priorities = cleanPriorities(clean.priorities);
  if (clean.socialLinks) clean.socialLinks = normalizeSocialLinks(clean.socialLinks);
  if ('voteTarget' in clean) clean.voteTarget = Number(clean.voteTarget) || 0;
  if ('registeredVoters' in clean) clean.registeredVoters = Number(clean.registeredVoters) || 0;
  if (clean.bannerImage !== undefined) clean.bannerUrl = clean.bannerImage;
  if (clean.logoUrl !== undefined) clean.logoImage = clean.logoUrl;
  clean.updatedAt = serverTimestamp();
  try {
    await updateDoc(doc(db, CAMPAIGNS, campaignId), clean);
  } catch (err) {
    if (err.code === 'permission-denied') throw new Error('You can only edit your own campaign page.');
    throw err;
  }
}

export function subscribeCampaign(campaignId, onData, onError) {
  return onSnapshot(
    doc(db, CAMPAIGNS, campaignId),
    (snap) => onData(snap.exists() ? normalizeCampaign(snap) : null),
    (err) => onError?.(err),
  );
}

export function subscribeMyCampaigns(uid, onData, onError) {
  const q = query(collection(db, CAMPAIGNS), where('ownerId', '==', uid), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map(normalizeCampaign)),
    (err) => onError?.(err),
  );
}

/**
 * Get campaign by slug.
 */
export async function getCampaignBySlug(slug) {
  const q = query(
    collection(db, CAMPAIGNS),
    where('slug', '==', slug),
    where('status', '==', 'active')
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return pickCampaignForSlug(snap.docs.map(normalizeCampaign));
}

/**
 * Several documents can carry the same slug (someone may copy a rival's link name).
 * The page created first wins — createdAt is set by the server and cannot be back-dated.
 */
export function pickCampaignForSlug(campaigns = []) {
  const ms = (c) => toDate(c.createdAt)?.getTime() || Number.MAX_SAFE_INTEGER;
  const sorted = [...campaigns].sort((a, b) => ms(a) - ms(b));
  return sorted.find((c) => !c.disabled) || sorted[0] || null;
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

  const snap = await getDocs(query(q, ...constraints));
  let campaigns = snap.docs.map(normalizeCampaign);

  // Auto-expire overdue
  await expireOverdueCampaigns(campaigns);
  campaigns = campaigns.map(normalizeCampaign);

  // Filter active only for public (hide expired even if status not yet updated)
  if (status === 'active') {
    campaigns = campaigns.filter((c) => c.status === 'active' && !c.isExpired);
  }

  if (sort === 'trending') {
    campaigns = [...campaigns].sort((a, b) => (b.views || 0) - (a.views || 0));
  } else {
    campaigns = sortCampaignsForDisplay(campaigns);
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

const CAMPAIGN_DATA_COLLECTIONS = [
  'supporters', 'volunteers', 'campaign_events', 'ad_campaigns', 'polling_stations',
  'field_links', 'election_results', 'poll_responses', 'broadcasts',
];

/**
 * Remove the voter data and tools linked to a campaign (privacy — Ghana Data Protection Act).
 * Small batches: every delete is checked against the campaign owner by the security rules.
 */
export async function purgeCampaignData(campaignId, { includeDonations = false, onProgress } = {}) {
  const names = includeDonations ? [...CAMPAIGN_DATA_COLLECTIONS, 'donations'] : CAMPAIGN_DATA_COLLECTIONS;
  let removed = 0;
  for (const name of names) {
    let snap;
    try {
      snap = await getDocs(query(collection(db, name), where('campaignId', '==', campaignId)));
    } catch {
      continue;
    }
    const refs = snap.docs.map((d) => d.ref);
    for (let i = 0; i < refs.length; i += 10) {
      const batch = writeBatch(db);
      refs.slice(i, i + 10).forEach((r) => batch.delete(r));
      await batch.commit().catch(() => {});
      removed += Math.min(10, refs.length - i);
      onProgress?.(removed);
    }
  }
  return removed;
}

/**
 * Owner: archive the page (status 'deleted'), stop card auto-renew and erase its voter data.
 * Admin: also removes the document itself (a tombstone in analytics/ stops the id being re-used).
 */
export async function deleteCampaign(campaignId, { onProgress } = {}) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('You must be signed in to delete a campaign');

  const ref = doc(db, CAMPAIGNS, campaignId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Campaign not found');
  const data = snap.data();
  const owner = data.ownerId === currentUser.uid;
  const admin = isAdmin(currentUser);
  if (!owner && !admin) {
    throw new Error('You can only delete your own campaigns');
  }

  if (data.subscription?.autoRenew) {
    await cancelAutoRenew(campaignId);
  }
  // Forget any connected Facebook ad account (revokes CampaignHub's access at Meta).
  await disconnectMeta(campaignId).catch(() => {});

  try {
    if (admin) {
      await purgeCampaignData(campaignId, { includeDonations: true, onProgress });
      await setDoc(doc(db, 'analytics', campaignId), { campaignId, deletedAt: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});
      await deleteDoc(ref);
    } else {
      await updateDoc(ref, {
        status: 'deleted',
        disabled: true,
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await purgeCampaignData(campaignId, { onProgress });
    }
  } catch (err) {
    if (err.code === 'permission-denied') {
      throw new Error('Permission denied — you cannot delete this campaign.');
    }
    throw err;
  }
}

/** Hide a live campaign page from the public directory without deleting records. */
export async function hideCampaignFromPublic(campaignId) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('You must be signed in to hide a campaign page');

  const ref = doc(db, CAMPAIGNS, campaignId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Campaign not found');
  if (snap.data().ownerId !== currentUser.uid && !isAdmin(currentUser)) {
    throw new Error('You can only hide your own campaign pages');
  }

  await updateDoc(ref, {
    status: 'disabled',
    disabled: true,
    hiddenAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Restore a hidden campaign page to the public directory. */
export async function relaunchCampaign(campaignId) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('You must be signed in to relaunch a campaign page');

  const ref = doc(db, CAMPAIGNS, campaignId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Campaign not found');
  if (snap.data().ownerId !== currentUser.uid && !isAdmin(currentUser)) {
    throw new Error('You can only relaunch your own campaign pages');
  }

  const end = toDate(snap.data().endDate);
  if (end && Date.now() > end.getTime()) {
    throw new Error('This page has expired. Extend hosting before relaunching.');
  }

  await updateDoc(ref, {
    status: 'active',
    disabled: false,
    hiddenAt: null,
    updatedAt: serverTimestamp(),
  });
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

/** Admin takedown. Uses status 'suspended' so the owner cannot undo it (and public queries stay provable). */
export async function adminSetSuspended(campaign, suspend) {
  const ref = doc(db, CAMPAIGNS, campaign.id);
  if (suspend) {
    await updateDoc(ref, {
      status: 'suspended',
      disabled: true,
      suspendedFromStatus: campaign.status === 'suspended' ? campaign.suspendedFromStatus || 'active' : campaign.status || 'active',
      suspendedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return;
  }
  const back = campaign.status === 'suspended' ? campaign.suspendedFromStatus || 'active' : campaign.status;
  await updateDoc(ref, {
    status: back === 'suspended' ? 'active' : back,
    disabled: back === 'disabled',
    suspendedAt: null,
    updatedAt: serverTimestamp(),
  });
}

/** @deprecated kept for older callers — use adminSetSuspended */
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
