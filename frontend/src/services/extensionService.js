import { Timestamp, collection, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/auth';
import { generatePaymentReference } from '../utils/paymentReference';
import { uploadPaymentScreenshot } from './storageService';
import { extendCampaign } from './campaignFirestoreService';
import { createNotification } from './notificationService';

export async function requestExtension({ campaignId, userId, pkg, campaign }) {
  const paymentReference = await generatePaymentReference();
  const docRef = await addDoc(collection(db, 'payments'), {
    campaignId,
    userId,
    type: 'extension',
    packageName: pkg.label,
    packageId: pkg.id,
    extensionDays: pkg.days,
    amount: pkg.price,
    paymentReference,
    screenshotUrl: '',
    paymentStatus: 'pending',
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'campaigns', campaignId), {
    extensionPending: true,
    updatedAt: serverTimestamp(),
  });

  return { id: docRef.id, paymentReference };
}

export async function submitExtensionProof({ paymentId, campaignId, screenshotFile }) {
  const screenshotUrl = await uploadPaymentScreenshot(screenshotFile);
  await updateDoc(doc(db, 'payments', paymentId), {
    screenshotUrl,
    paymentStatus: 'pending_review',
    proofSubmittedAt: serverTimestamp(),
  });
  return screenshotUrl;
}

export async function approveExtension({ paymentId, campaignId, campaign, extensionDays, ownerId, title }) {
  await updateDoc(doc(db, 'payments', paymentId), {
    paymentStatus: 'verified',
    verifiedAt: serverTimestamp(),
  });

  await extendCampaign(campaignId, extensionDays, campaign.endDate, campaign.durationDays || 0);

  await updateDoc(doc(db, 'campaigns', campaignId), {
    extensionPending: false,
    updatedAt: serverTimestamp(),
  });

  await createNotification({
    userId: ownerId,
    message: `Extension approved! "${title}" extended by ${extensionDays} days.`,
    type: 'extension_success',
    campaignId,
  });
}

export function isNearExpiry(campaign, daysThreshold = 7) {
  if (!campaign?.remainingMs) return false;
  const daysLeft = campaign.remainingMs / (1000 * 60 * 60 * 24);
  return daysLeft <= daysThreshold && daysLeft > 0;
}

export function shouldShowExpiryWarning(campaign, daysThreshold = 3) {
  if (!campaign?.remainingMs) return false;
  const daysLeft = campaign.remainingMs / (1000 * 60 * 60 * 24);
  return daysLeft <= daysThreshold && daysLeft > 0;
}
