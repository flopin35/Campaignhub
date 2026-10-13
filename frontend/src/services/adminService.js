import { collection, doc, getDocs, updateDoc, serverTimestamp, Timestamp, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/auth';
import { toMs } from '../utils/billing';
import { createNotification } from './notificationService';

const DAY = 86400000;

/** Admin: grant (or extend) Pro manually — e.g. a bank transfer or a partner deal. */
export async function adminGrantPro(campaign, days = 30, note = 'Granted by admin') {
  const now = Date.now();
  const base = Math.max(now, toMs(campaign.subscription?.currentPeriodEnd), campaign.packageType === 'trial' ? toMs(campaign.trialEndsAt) : 0);
  const periodEnd = base + days * DAY;
  const publicUntil = periodEnd + 3 * DAY;
  await updateDoc(doc(db, 'campaigns', campaign.id), {
    subscription: {
      ...(campaign.subscription || {}),
      plan: 'pro',
      status: 'active',
      cycle: days >= 300 ? 'yearly' : 'monthly',
      provider: 'manual',
      currentPeriodStart: Timestamp.fromDate(new Date(base)),
      currentPeriodEnd: Timestamp.fromDate(new Date(periodEnd)),
      autoRenew: false,
      note,
      updatedAt: Timestamp.fromDate(new Date(now)),
    },
    packageType: 'pro',
    packageName: 'CampaignHub Pro',
    paymentVerified: true,
    status: campaign.status === 'disabled' ? 'disabled' : 'active',
    startDate: campaign.startDate ? Timestamp.fromDate(new Date(toMs(campaign.startDate))) : Timestamp.fromDate(new Date(now)),
    endDate: Timestamp.fromDate(new Date(publicUntil)),
    expiresAt: Timestamp.fromDate(new Date(publicUntil)),
    updatedAt: serverTimestamp(),
  });
  await createNotification({
    userId: campaign.ownerId,
    message: `CampaignHub Pro is active on "${campaign.title}" for ${days} days.`,
    type: 'payment_success',
    campaignId: campaign.id,
  }).catch(() => {});
}

export async function adminEndPro(campaign) {
  await updateDoc(doc(db, 'campaigns', campaign.id), {
    'subscription.currentPeriodEnd': Timestamp.fromDate(new Date()),
    'subscription.status': 'cancelled',
    'subscription.autoRenew': false,
    updatedAt: serverTimestamp(),
  });
}

export function subscribeBillingTransactions(cb, max = 300) {
  const q = query(collection(db, 'billing_transactions'), orderBy('createdAt', 'desc'), limit(max));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([]),
  );
}

export async function getUsersCount() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.size;
}
