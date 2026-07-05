import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/auth';
import { generatePaymentReference } from '../utils/paymentReference';
import { uploadPaymentScreenshot } from './storageService';
import { createNotification } from './notificationService';
import { PAYMENT_DETAILS } from '../data/packages';

export { PAYMENT_DETAILS };

export function subscribeDonations(campaignId, callback) {
  const q = query(
    collection(db, 'donations'),
    where('campaignId', '==', campaignId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => callback([])
  );
}

export async function createDonation({
  campaignId,
  campaignTitle,
  ownerId,
  amount,
  donorName,
  donorPhone,
  donorEmail = '',
  region = '',
  constituency = '',
  anonymous = false,
  userId = null,
  recurring = false,
}) {
  const paymentReference = await generatePaymentReference();

  const data = {
    campaignId,
    userId,
    amount: Number(amount),
    donorName: donorName.trim(),
    donorPhone: donorPhone.trim(),
    donorEmail: donorEmail.trim(),
    region,
    constituency,
    anonymous,
    recurring,
    paymentReference,
    paymentStatus: 'pending',
    screenshotUrl: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, 'donations'), data);

  if (ownerId) {
    await createNotification({
      userId: ownerId,
      message: `Donation received: ₵${amount} for "${campaignTitle}" (ref ${paymentReference})`,
      type: 'donation_pending',
      campaignId,
    }).catch(() => {});
  }

  return { id: ref.id, ...data };
}

export async function submitDonationProof({ donationId, screenshotFile, onUploadProgress }) {
  const screenshotUrl = await uploadPaymentScreenshot(screenshotFile, onUploadProgress);
  await updateDoc(doc(db, 'donations', donationId), {
    screenshotUrl,
    paymentStatus: 'pending_review',
    proofSubmittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return screenshotUrl;
}

export async function verifyDonation(donationId, { ownerId, campaignTitle, donorName, amount }) {
  await updateDoc(doc(db, 'donations', donationId), {
    paymentStatus: 'verified',
    verifiedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (ownerId) {
    await createNotification({
      userId: ownerId,
      message: `Donation verified: ₵${amount} from ${donorName} for "${campaignTitle}"`,
      type: 'donation_verified',
      campaignId: null,
    }).catch(() => {});
  }
}

export function getDonationStats(donations = []) {
  const verified = donations.filter((d) => d.paymentStatus === 'verified');
  const pending = donations.filter((d) => ['pending', 'pending_review'].includes(d.paymentStatus));
  const total = verified.reduce((s, d) => s + (d.amount || 0), 0);
  const leaderboard = verified
    .filter((d) => !d.anonymous)
    .reduce((map, d) => {
      const key = d.donorName;
      map[key] = (map[key] || 0) + (d.amount || 0);
      return map;
    }, {});

  return {
    totalRaised: total,
    donorCount: verified.length,
    pendingCount: pending.length,
    averageGift: verified.length ? Math.round(total / verified.length) : 0,
    leaderboard: Object.entries(leaderboard)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10),
  };
}
