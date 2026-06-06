import { Timestamp, collection, doc, addDoc, updateDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/auth';
import { generatePaymentReference } from '../utils/paymentReference';
import { uploadPaymentScreenshot } from './storageService';
import { createNotification } from './notificationService';

/**
 * Create payment record linked to campaign.
 */
export async function createPayment({ campaignId, userId, pkg }) {
  const paymentReference = await generatePaymentReference();

  const paymentData = {
    campaignId,
    userId,
    packageName: pkg.name,
    packageId: pkg.id,
    amount: pkg.price,
    paymentReference,
    screenshotUrl: '',
    paymentStatus: 'pending',
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

  await updateDoc(doc(db, 'campaigns', campaignId), {
    status: 'pending_review',
    updatedAt: serverTimestamp(),
  });

  try {
    await createNotification({
      userId,
      message: 'Payment proof submitted. Awaiting admin verification.',
      type: 'payment_approved',
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
 * Admin: reject payment.
 */
export async function rejectPayment({ paymentId, campaignId, ownerId, reason }) {
  if (paymentId) {
    await updateDoc(doc(db, 'payments', paymentId), {
      paymentStatus: 'rejected',
      rejectionReason: reason || 'Payment could not be verified',
      rejectedAt: serverTimestamp(),
    });
  }

  await updateDoc(doc(db, 'campaigns', campaignId), {
    status: 'rejected',
    updatedAt: serverTimestamp(),
  });

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

export async function getAllPayments() {
  const snap = await getDocs(collection(db, 'payments'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getUserPayments(userId) {
  const q = query(collection(db, 'payments'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
