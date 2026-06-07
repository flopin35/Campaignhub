import { isFirebaseConfigured, getDb } from '../config/firebaseConfig.js';

const COLLECTION = 'campaigns';

/**
 * Check all active campaigns and mark expired ones.
 * Runs on server start and on a periodic interval.
 */
export async function expireCampaigns() {
  if (!isFirebaseConfigured()) {
    return 0;
  }

  const now = new Date();
  let expiredCount = 0;

  const db = getDb();
  const snapshot = await db
    .collection(COLLECTION)
    .where('status', '==', 'active')
    .get();

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.expiryDate && now > new Date(data.expiryDate)) {
      batch.update(doc.ref, {
        status: 'expired',
        updatedAt: now.toISOString(),
      });
      expiredCount++;
    }
  });

  if (expiredCount > 0) {
    await batch.commit();
    console.log(`Auto-expired ${expiredCount} campaign(s)`);
  }

  return expiredCount;
}

/**
 * Start periodic expiry checker (every hour).
 */
export function startExpiryScheduler() {
  if (!isFirebaseConfigured()) {
    console.warn('Expiry scheduler skipped: Firebase Admin not configured');
    return;
  }

  expireCampaigns();
  const INTERVAL = 60 * 60 * 1000;
  setInterval(expireCampaigns, INTERVAL);
  console.log('Expiry scheduler started');
}

/**
 * Calculate expiry date from start date and duration in days.
 */
export function calculateExpiryDate(startDate, durationDays) {
  const start = new Date(startDate);
  start.setDate(start.getDate() + durationDays);
  return start.toISOString();
}

/**
 * Get remaining time in milliseconds for a campaign.
 */
export function getRemainingMs(expiryDate) {
  if (!expiryDate) return null;
  return Math.max(0, new Date(expiryDate) - new Date());
}
