import { collection, doc, getDocs, updateDoc, serverTimestamp, Timestamp, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase/auth';
import { toMs } from '../utils/billing';
import { createNotification } from './notificationService';
import { cancelAutoRenew } from './billingService';

const DAY = 86400000;

/** Admin: grant (or extend) Pro manually — e.g. a bank transfer or a partner deal. */
export async function adminGrantPro(campaign, days = 30, note = 'Granted by admin') {
  const now = Date.now();
  const sub = campaign.subscription || {};
  const paidThroughBefore = toMs(sub.paidThrough) || toMs(sub.currentPeriodEnd);
  const base = Math.max(now, paidThroughBefore, campaign.packageType === 'trial' ? toMs(campaign.trialEndsAt) : 0);
  const paidThrough = base + days * DAY;
  // Keep a running card subscription's 2-day buffer, and never shorten hosting already paid for.
  const periodEnd = paidThrough + (sub.autoRenew ? 2 * DAY : 0);
  const publicUntil = Math.max(periodEnd + 3 * DAY, toMs(campaign.endDate));
  const keepStatus = ['disabled', 'suspended', 'rejected', 'deleted'].includes(campaign.status);
  await updateDoc(doc(db, 'campaigns', campaign.id), {
    subscription: {
      ...sub,
      plan: 'pro',
      status: 'active',
      cycle: days >= 300 ? 'yearly' : 'monthly',
      provider: sub.autoRenew ? sub.provider || 'paystack' : 'manual',
      currentPeriodStart: Timestamp.fromDate(new Date(base)),
      currentPeriodEnd: Timestamp.fromDate(new Date(periodEnd)),
      paidThrough: Timestamp.fromDate(new Date(paidThrough)),
      autoRenew: !!sub.autoRenew,
      note,
      updatedAt: Timestamp.fromDate(new Date(now)),
    },
    packageType: 'pro',
    packageName: 'CampaignHub Pro',
    paymentVerified: true,
    status: keepStatus ? campaign.status : 'active',
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

/** Admin: end Pro now — stops card auto-renew at Paystack first, and ends legacy premium too. */
export async function adminEndPro(campaign) {
  if (campaign.subscription?.autoRenew) {
    await cancelAutoRenew(campaign.id);
  }
  const now = Timestamp.fromDate(new Date());
  const patch = {
    'subscription.currentPeriodEnd': now,
    'subscription.paidThrough': now,
    'subscription.status': 'cancelled',
    'subscription.autoRenew': false,
    updatedAt: serverTimestamp(),
  };
  if (campaign.premiumFeatures?.['campaign-crm']) {
    patch['premiumFeatures.campaign-crm.expiresAt'] = now;
    patch['premiumFeatures.campaign-crm.active'] = false;
  }
  if (campaign.packageType === 'trial') patch.trialEndsAt = now;
  await updateDoc(doc(db, 'campaigns', campaign.id), patch);
}

/** Admin: mark an old MoMo screenshot proof as handled (Pro itself is granted with adminGrantPro). */
export async function adminMarkLegacyPaymentVerified(paymentId, days) {
  await updateDoc(doc(db, 'payments', paymentId), {
    paymentStatus: 'verified',
    verifiedAt: serverTimestamp(),
    verifiedVia: `admin-grant-${days}d`,
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
