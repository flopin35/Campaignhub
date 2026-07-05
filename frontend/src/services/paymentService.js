import { Timestamp, collection, doc, addDoc, updateDoc, getDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase/auth';
import { generatePaymentReference } from '../utils/paymentReference';
import { uploadPaymentScreenshot } from './storageService';
import { createNotification } from './notificationService';
import { activateCampaignBoost } from './boostService';
import { getBoostPackageById } from '../data/boostPackages';
import { PREMIUM_FEATURE_IDS, getPremiumPackageById, getPurchasablePlan, getHostingPackageById } from '../data/premiumPackages';
import { extendCampaign } from './campaignFirestoreService';
import { isUserVerified, getUserProfile } from './authService';

function mapFirestoreError(err, fallback) {
  if (err?.code === 'permission-denied') {
    return new Error('Permission denied — sign in again and ensure you own this campaign.');
  }
  if (err?.code === 'invalid-argument') {
    return new Error('Invalid payment data — refresh the page and try again.');
  }
  return new Error(err?.message || fallback);
}

async function safeNotify(payload) {
  try {
    await createNotification(payload);
  } catch (err) {
    console.warn('Notification skipped:', err.message);
  }
}

export function scorePaymentPriority(payment) {
  if (!payment) return -1;
  if (payment.paymentStatus === 'pending_review') {
    if (payment.purchaseType === 'premium' || payment.purchaseType === 'hosting') return 100;
    if (payment.type === 'extension') return 90;
    return 80;
  }
  if (payment.paymentStatus === 'pending') return 50;
  return 10;
}

function pickPreferredPayment(docs) {
  const all = docs.map((d) => ({ id: d.id, ...d.data() }));
  if (!all.length) return null;
  return all.sort((a, b) => scorePaymentPriority(b) - scorePaymentPriority(a))[0];
}

function matchesPlan(payment, { userId, premiumFeatureId, variantId, purchaseType }) {
  return (
    payment.userId === userId
    && payment.purchaseType === purchaseType
    && payment.premiumFeatureId === (premiumFeatureId || null)
    && (payment.variantId || null) === (variantId || null)
  );
}

async function findPaymentForPlan({ campaignId, userId, premiumFeatureId, variantId, purchaseType, statuses }) {
  const q = query(collection(db, 'payments'), where('campaignId', '==', campaignId));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => statuses.includes(p.paymentStatus) && matchesPlan(p, { userId, premiumFeatureId, variantId, purchaseType }))
    .sort((a, b) => {
      if (a.paymentStatus === 'pending_review' && b.paymentStatus !== 'pending_review') return -1;
      if (b.paymentStatus === 'pending_review' && a.paymentStatus !== 'pending_review') return 1;
      return (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0);
    })[0] || null;
}

export async function getPaymentForPlan({ campaignId, userId, premiumFeatureId, variantId, purchaseType }) {
  return findPaymentForPlan({
    campaignId,
    userId,
    premiumFeatureId: premiumFeatureId || null,
    variantId: variantId || null,
    purchaseType,
    statuses: ['pending', 'pending_review'],
  });
}

/**
 * Create payment record linked to campaign.
 */
export async function createPayment({ campaignId, userId, pkg, purchaseType = 'campaign', premiumFeatureId, variantId }) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('You must be signed in to make a payment.');
  if (currentUser.uid !== userId) throw new Error('Payment user mismatch — please sign in again.');

  const profile = await getUserProfile(currentUser.uid);
  if (!isUserVerified(currentUser, profile)) {
    throw new Error('Your account must be verified before making a payment. Please sign in again.');
  }

  try {
    await currentUser.getIdToken();
  } catch {
    throw new Error('Session expired — please sign in again.');
  }

  const amount = Number(pkg.price);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Invalid payment amount for this package.');
  }

  const campaignSnap = await getDoc(doc(db, 'campaigns', campaignId));
  if (!campaignSnap.exists()) throw new Error('Campaign not found.');
  const campaign = campaignSnap.data();
  if (campaign.ownerId !== userId) {
    throw new Error('You can only purchase upgrades for your own campaigns.');
  }

  const planMatch = {
    campaignId,
    userId,
    premiumFeatureId: premiumFeatureId || null,
    variantId: variantId || null,
    purchaseType,
  };

  const awaitingReview = await findPaymentForPlan({
    ...planMatch,
    statuses: ['pending_review'],
  });
  if (awaitingReview) {
    return { ...awaitingReview, awaitingReview: true };
  }

  const reusable = await findPaymentForPlan({
    ...planMatch,
    statuses: ['pending'],
  });
  if (reusable) return reusable;

  const paymentReference = await generatePaymentReference();

  const paymentData = {
    campaignId,
    userId,
    packageName: pkg.name || 'Premium',
    packageId: pkg.id,
    amount,
    durationDays: pkg.durationDays ?? null,
    paymentReference,
    screenshotUrl: '',
    paymentStatus: 'pending',
    purchaseType,
    premiumFeatureId: premiumFeatureId || null,
    variantId: variantId || null,
    createdAt: serverTimestamp(),
  };

  try {
    const docRef = await addDoc(collection(db, 'payments'), paymentData);
    return { id: docRef.id, ...paymentData, paymentReference };
  } catch (err) {
    throw mapFirestoreError(err, 'Could not create payment record');
  }
}

/**
 * Upload payment proof and move campaign to pending_review.
 */
export async function submitPaymentProof({ paymentId, campaignId, userId, screenshotFile, onUploadProgress }) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('You must be signed in to upload payment proof.');
  if (!paymentId) throw new Error('Payment reference missing — go back and generate a new reference.');
  if (!screenshotFile) throw new Error('Please select a payment screenshot.');

  try {
    await currentUser.getIdToken();
  } catch {
    throw new Error('Session expired — please sign in again.');
  }

  const paySnap = await getDoc(doc(db, 'payments', paymentId));
  if (!paySnap.exists()) throw new Error('Payment not found.');
  const existing = { id: paySnap.id, ...paySnap.data() };
  if (existing.userId !== currentUser.uid) throw new Error('This payment does not belong to your account.');
  if (existing.campaignId !== campaignId) throw new Error('Payment does not match this campaign.');
  if (existing.paymentStatus === 'pending_review') {
    return existing.screenshotUrl || '';
  }
  if (existing.paymentStatus !== 'pending') {
    throw new Error('Payment proof was already submitted or this payment was processed.');
  }

  let screenshotUrl;
  try {
    screenshotUrl = await uploadPaymentScreenshot(screenshotFile, (pct) => {
      onUploadProgress?.(pct);
    });
  } catch (err) {
    throw mapFirestoreError(err, 'Failed to upload payment screenshot');
  }

  try {
    await updateDoc(doc(db, 'payments', paymentId), {
      screenshotUrl,
      paymentStatus: 'pending_review',
      proofSubmittedAt: serverTimestamp(),
    });
  } catch (err) {
    throw mapFirestoreError(err, 'Failed to save payment proof');
  }

  if (existing.purchaseType === 'premium' || existing.purchaseType === 'hosting') {
    await safeNotify({
      userId,
      message: 'Premium payment proof submitted. Awaiting admin verification.',
      type: 'payment_pending',
      campaignId,
    });
    return screenshotUrl;
  }

  await updateDoc(doc(db, 'campaigns', campaignId), {
    status: 'pending_review',
    updatedAt: serverTimestamp(),
  });

  await safeNotify({
    userId,
    message: 'Payment proof submitted. Awaiting admin verification.',
    type: 'payment_pending',
    campaignId,
  });

  return screenshotUrl;
}

/**
 * Admin: verify payment and activate campaign.
 */
export async function verifyPaymentAndActivate({ paymentId, campaignId, campaign, payment }) {
  if (payment?.paymentStatus === 'verified') {
    throw new Error('This payment was already verified.');
  }

  const start = new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + (campaign.durationDays || 7));

  await updateDoc(doc(db, 'payments', paymentId), {
    paymentStatus: 'verified',
    verifiedAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'campaigns', campaignId), {
    status: 'active',
    paymentVerified: true,
    startDate: Timestamp.fromDate(start),
    endDate: Timestamp.fromDate(end),
    expiresAt: Timestamp.fromDate(end),
    updatedAt: serverTimestamp(),
  });

  await safeNotify({
    userId: campaign.ownerId,
    message: `Your official campaign page "${campaign.title}" is now live!`,
    type: 'campaign_approved',
    campaignId,
  });
}

function applyPremiumFeature(premiumFeatures, updates, featureId, { durationDays, variantId }, now) {
  if (featureId === PREMIUM_FEATURE_IDS.VISIBILITY_BOOST) {
    const boostPkg = getBoostPackageById(variantId);
    premiumFeatures[featureId] = {
      active: true,
      variantId,
      activatedAt: serverTimestamp(),
      expiresAt: boostPkg ? Timestamp.fromDate(new Date(now.getTime() + boostPkg.durationMs)) : null,
    };
    return boostPkg;
  }
  if (featureId === PREMIUM_FEATURE_IDS.VERIFIED_BADGE) {
    premiumFeatures[featureId] = { active: true, activatedAt: serverTimestamp() };
    updates.verificationRequested = true;
    updates.verificationRequestedAt = serverTimestamp();
    return null;
  }
  const days = durationDays || 30;
  premiumFeatures[featureId] = {
    active: true,
    activatedAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(new Date(now.getTime() + days * 86400000)),
  };
  return null;
}

export async function verifyPremiumPayment({ paymentId, campaignId, payment, campaign }) {
  if (payment?.paymentStatus === 'verified') {
    throw new Error('This payment was already verified.');
  }
  if (payment?.paymentStatus !== 'pending_review') {
    throw new Error('Payment must be in pending review before verification.');
  }

  await updateDoc(doc(db, 'payments', paymentId), {
    paymentStatus: 'verified',
    verifiedAt: serverTimestamp(),
  });

  const featureId = payment.premiumFeatureId;
  const variantId = payment.variantId;
  const now = new Date();
  const updates = { updatedAt: serverTimestamp() };
  const premiumFeatures = { ...(campaign.premiumFeatures || {}) };

  const bundle = getPremiumPackageById(featureId);

  if (payment.purchaseType === 'hosting') {
    const hosting = getHostingPackageById(featureId) || getPurchasablePlan(featureId);
    if (hosting) {
      await extendCampaign(
        campaignId,
        hosting.durationDays,
        campaign.endDate,
        campaign.durationDays || 0,
      );
      premiumFeatures[featureId] = {
        active: true,
        activatedAt: serverTimestamp(),
        tier: hosting.priorityLevel,
      };
      await updateDoc(doc(db, 'campaigns', campaignId), {
        priorityLevel: hosting.priorityLevel,
        featured: hosting.featured,
        spotlight: hosting.spotlight,
        premiumFeatures,
        updatedAt: serverTimestamp(),
      });
    }
  } else if ((bundle?.isBundle || bundle?.isSubscription) && bundle.includes) {
    for (const includedId of bundle.includes) {
      const boostPkg = applyPremiumFeature(
        premiumFeatures,
        updates,
        includedId,
        {
          durationDays: payment.durationDays || bundle.durationDays,
          variantId: includedId === PREMIUM_FEATURE_IDS.VISIBILITY_BOOST ? bundle.boostVariantId : null,
        },
        now,
      );
      if (boostPkg) {
        await activateCampaignBoost(campaignId, boostPkg, campaign);
      }
    }
    premiumFeatures[featureId] = { active: true, activatedAt: serverTimestamp(), bundle: true };
    updates.premiumFeatures = premiumFeatures;
    await updateDoc(doc(db, 'campaigns', campaignId), updates);
  } else {
    const boostPkg = applyPremiumFeature(
      premiumFeatures,
      updates,
      featureId,
      { durationDays: payment.durationDays, variantId },
      now,
    );
    if (boostPkg) {
      await activateCampaignBoost(campaignId, boostPkg, campaign);
    }
    updates.premiumFeatures = premiumFeatures;
    await updateDoc(doc(db, 'campaigns', campaignId), updates);
  }

  if (payment.purchaseType !== 'hosting') {
    await safeNotify({
      userId: campaign.ownerId,
      message: `Premium activated for your campaign page "${campaign.title}"`,
      type: 'campaign_approved',
      campaignId,
    });
  }

  if (updates.verificationRequested) {
    await safeNotify({
      userId: campaign.ownerId,
      message: `Verification requested for "${campaign.title}" — an admin will review your campaign page.`,
      type: 'verification_requested',
      campaignId,
    });
  }
}

/**
 * Admin: reject payment.
 */
export async function rejectPayment({ paymentId, campaignId, ownerId, reason, isPremium = false }) {
  if (paymentId) {
    await updateDoc(doc(db, 'payments', paymentId), {
      paymentStatus: 'rejected',
      rejectionReason: reason || 'Payment could not be verified',
      rejectedAt: serverTimestamp(),
    });
  }

  if (!isPremium && campaignId) {
    await updateDoc(doc(db, 'campaigns', campaignId), {
      status: 'rejected',
      updatedAt: serverTimestamp(),
    });
  }

  await safeNotify({
    userId: ownerId,
    message: reason || 'Payment rejected. Please contact support.',
    type: 'campaign_rejected',
    campaignId,
  });
}

export async function getPaymentByCampaign(campaignId) {
  const q = query(collection(db, 'payments'), where('campaignId', '==', campaignId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return pickPreferredPayment(snap.docs);
}

export async function getPendingPremiumPayments() {
  const q = query(collection(db, 'payments'), where('paymentStatus', '==', 'pending_review'));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => p.purchaseType === 'premium' || p.purchaseType === 'hosting');
}

export async function getAllPayments() {
  const snap = await getDocs(collection(db, 'payments'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getUserPayments(userId) {
  const q = query(collection(db, 'payments'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function getRevenueSummary(payments) {
  const verified = payments.filter((p) => p.paymentStatus === 'verified');
  const pending = payments.filter((p) => p.paymentStatus === 'pending_review');
  const totalRevenue = verified.reduce((sum, p) => sum + (p.amount || 0), 0);
  const pendingAmount = pending.reduce((sum, p) => sum + (p.amount || 0), 0);
  return {
    totalRevenue,
    pendingAmount,
    verifiedCount: verified.length,
    pendingCount: pending.length,
    totalCount: payments.length,
  };
}
