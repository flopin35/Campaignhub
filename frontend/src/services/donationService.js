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
import { normalizePhone, isValidPhone } from '../utils/format';
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
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 5) throw new Error('The minimum donation is ₵5.');
  if (value > 1000000) throw new Error('For gifts above ₵1,000,000 please contact the campaign directly.');
  if (!String(donorName || '').trim()) throw new Error('Enter your name.');
  if (donorPhone && !isValidPhone(donorPhone)) throw new Error('Enter a valid phone number (e.g. 024 123 4567).');
  const paymentReference = await generatePaymentReference();

  const data = {
    campaignId,
    userId,
    amount: value,
    donorName: String(donorName).trim().slice(0, 120),
    donorPhone: donorPhone ? normalizePhone(donorPhone) : '',
    donorEmail: String(donorEmail || '').trim().slice(0, 160),
    region: String(region || '').slice(0, 80),
    constituency: String(constituency || '').slice(0, 120),
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
      message: `Donation received: ₵${value} for "${campaignTitle}" (ref ${paymentReference})`.slice(0, 300),
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

/** Public donor confirms they sent MoMo by entering the transaction ID (no login needed). */
export async function submitDonationTxn({ donationId, momoTxnId }) {
  await updateDoc(doc(db, 'donations', donationId), {
    momoTxnId: String(momoTxnId || '').trim().slice(0, 40),
    paymentStatus: 'pending_review',
    proofSubmittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Owner records a cash / offline / direct MoMo gift. */
export async function recordOfflineDonation(campaignId, { donorName, donorPhone = '', amount, note = '', method = 'cash' }) {
  const value = Number(amount);
  if (!donorName?.trim()) throw new Error('Donor name is required');
  if (!Number.isFinite(value) || value < 5) throw new Error('Amount must be at least ₵5');
  if (value > 1000000) throw new Error('Record gifts above ₵1,000,000 in parts.');
  const paymentReference = await generatePaymentReference();
  const ref = await addDoc(collection(db, 'donations'), {
    campaignId,
    userId: null,
    amount: value,
    donorName: donorName.trim().slice(0, 120),
    donorPhone: donorPhone ? normalizePhone(donorPhone).slice(0, 20) : '',
    donorEmail: '',
    region: '',
    constituency: '',
    anonymous: false,
    recurring: false,
    paymentReference,
    paymentStatus: 'pending',
    screenshotUrl: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await updateDoc(ref, {
    paymentStatus: 'verified',
    method,
    note: String(note).slice(0, 300),
    verifiedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function rejectDonation(donationId) {
  await updateDoc(doc(db, 'donations', donationId), {
    paymentStatus: 'rejected',
    updatedAt: serverTimestamp(),
  });
}
