import admin, { getDb, isFirebaseConfigured } from '../config/firebaseConfig.js';

async function createFirestoreNotification({ userId, message, type, campaignId = null }) {
  if (!isFirebaseConfigured() || !userId) {
    return { sent: false, type };
  }

  const db = getDb();
  await db.collection('notifications').add({
    userId,
    message,
    type,
    campaignId,
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { sent: true, type };
}

async function resolveAdminUserId() {
  if (!isFirebaseConfigured()) return null;

  const adminEmail = (process.env.ADMIN_EMAIL || 'daakukwaku7@gmail.com').toLowerCase();
  const db = getDb();
  const snapshot = await db
    .collection('users')
    .where('email', '==', adminEmail)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0].id;
}

export async function notifyCampaignApproved(campaign) {
  return createFirestoreNotification({
    userId: campaign.ownerId,
    message: `Your campaign "${campaign.title}" has been approved and is now live.`,
    type: 'campaign_approved',
    campaignId: campaign.id,
  });
}

export async function notifyCampaignRejected(campaign, reason = '') {
  const detail = reason ? ` Reason: ${reason}` : '';
  return createFirestoreNotification({
    userId: campaign.ownerId,
    message: `Your campaign "${campaign.title}" was not approved.${detail}`,
    type: 'campaign_rejected',
    campaignId: campaign.id,
  });
}

export async function notifyCampaignExpiring(campaign, daysLeft) {
  return createFirestoreNotification({
    userId: campaign.ownerId,
    message: `Your campaign "${campaign.title}" expires in ${daysLeft} day(s).`,
    type: 'campaign_expiring',
    campaignId: campaign.id,
  });
}

export async function notifyNewSubmission(campaign) {
  const adminUserId = await resolveAdminUserId();
  if (!adminUserId) return { sent: false, type: 'new_submission' };

  return createFirestoreNotification({
    userId: adminUserId,
    message: `New campaign submission: "${campaign.title}" — pending review.`,
    type: 'new_submission',
    campaignId: campaign.id,
  });
}
