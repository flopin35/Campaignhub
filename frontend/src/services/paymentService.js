import { Timestamp, collection, doc, addDoc, updateDoc, getDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/auth';
import { generatePaymentReference } from '../utils/paymentReference';
import { uploadPaymentScreenshot } from './storageService';
import { createNotification } from './notificationService';
import { activateCampaignBoost } from './boostService';
import { getBoostPackageById } from '../data/boostPackages';
import { PREMIUM_FEATURE_IDS, getPremiumPackageById, getPurchasablePlan } from '../data/premiumPackages';
import { extendCampaign } from './campaignFirestoreService';

/**
 * Create payment record linked to campaign.
 */
export async function createPayment({ campaignId, userId, pkg, purchaseType = 'campaign', premiumFeatureId, variantId }) {
  const paymentReference = await generatePaymentReference();

  const paymentData = {
    campaignId,
    userId,
    packageName: pkg.name,
    packageId: pkg.id,
    amount: pkg.price,
    durationDays: pkg.durationDays || null,
    paymentReference,
    screenshotUrl: '',
    paymentStatus: 'pending',
    purchaseType,
    premiumFeatureId: premiumFeatureId || null,
    variantId: variantId || null,
    createdAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'payments'), paymentData);
  return { id: docRef.id, ...paymentData, paymentReference };
}

/**
 * Upload payment proof and move campaign to pending_review.
 */
export async function submitPaymentProof({ paymentId, campaignId, userId, screenshotFile, onUploadProgress }) {
  const screenshotUrl = await uploadPaymentScreenshot(screenshotFile, (pct) => {
    onUploadProgress?.(pct);
  });

  await updateDoc(doc(db, 'payments', paymentId), {
    screenshotUrl,
    paymentStatus: 'pending_review',
    proofSubmittedAt: serverTimestamp(),
  });

  const paySnap = await getDoc(doc(db, 'payments', paymentId));
  const payment = paySnap.data();

  if (payment?.purchaseType === 'premium' || payment?.purchaseType === 'hosting') {
    await createNotification({
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

  try {
    await createNotification({
      userId,
      message: 'Payment proof submitted. Awaiting admin verification.',
      type: 'payment_pending',
      campaignId,
    });
  } catch (err) {
    console.warn('Notification skipped:', err.message);
  }

  return screenshotUrl;
}

/**
 * Admin: verify payment and activate campaign.
 */
export async function verifyPaymentAndActivate({ paymentId, campaignId, campaign }) {
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
    verified: true,
    startDate: Timestamp.fromDate(start),
    endDate: Timestamp.fromDate(end),
    expiresAt: Timestamp.fromDate(end),
    updatedAt: serverTimestamp(),
  });

  await createNotification({
    userId: campaign.ownerId,
    message: `Your campaign "${campaign.title}" is now live!`,
    type: 'campaign_approved',
    campaignId,
  });
}

/**
 * Admin: verify premium purchase and activate feature on campaign.
 */
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
    updates.verified = true;
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
    const hosting = getPurchasablePlan(featureId);
    if (hosting) {
      await extendCampaign(
        campaignId,
        hosting.durationDays,
        campaign.endDate,
        campaign.durationDays || 0
      );
      await updateDoc(doc(db, 'campaigns', campaignId), {
        priorityLevel: hosting.priorityLevel,
        featured: hosting.featured,
        spotlight: hosting.spotlight,
        updatedAt: serverTimestamp(),
      });
    }
  } else if (bundle?.isBundle && bundle.includes) {
    for (const includedId of bundle.includes) {
      const boostPkg = applyPremiumFeature(
        premiumFeatures,
        updates,
        includedId,
        {
          durationDays: payment.durationDays || bundle.durationDays,
          variantId: includedId === PREMIUM_FEATURE_IDS.VISIBILITY_BOOST ? bundle.boostVariantId : null,
        },
        now
      );
      if (boostPkg) {
        await activateCampaignBoost(campaignId, boostPkg, campaign);
      }
    }
    premiumFeatures[featureId] = { active: true, activatedAt: serverTimestamp(), bundle: true };
    updates.premiumFeatures = premiumFeatures;
    Object.assign(updates, { verified: updates.verified ?? campaign.verified });
    await updateDoc(doc(db, 'campaigns', campaignId), updates);
  } else {
    const boostPkg = applyPremiumFeature(
      premiumFeatures,
      updates,
      featureId,
      { durationDays: payment.durationDays, variantId },
      now
    );
    if (boostPkg) {
      await activateCampaignBoost(campaignId, boostPkg, campaign);
    }
    updates.premiumFeatures = premiumFeatures;
    await updateDoc(doc(db, 'campaigns', campaignId), updates);
  }

  await createNotification({
    userId: campaign.ownerId,
    message: `Premium feature activated for "${campaign.title}"`,
    type: 'campaign_approved',
    campaignId,
  });
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

  await createNotification({
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
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function getPendingPremiumPayments() {
  const q = query(collection(db, 'payments'), where('paymentStatus', '==', 'pending_review'));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => p.purchaseType === 'premium');
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
