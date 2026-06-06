import { doc, updateDoc, serverTimestamp, getDocs, collection } from 'firebase/firestore';
import { db } from '../firebase/auth';
import { createNotification } from './notificationService';

export async function verifyCampaign(campaignId, verified = true, ownerId, title) {
  await updateDoc(doc(db, 'campaigns', campaignId), {
    verified,
    updatedAt: serverTimestamp(),
  });
  if (ownerId) {
    await createNotification({
      userId: ownerId,
      message: verified
        ? `Your campaign "${title}" has been verified.`
        : `Verification removed from "${title}".`,
      type: verified ? 'campaign_verified' : 'verification_revoked',
      campaignId,
    });
  }
}

export async function verifyUser(userId, verified = true) {
  await updateDoc(doc(db, 'users', userId), {
    verified,
    updatedAt: serverTimestamp(),
  });
  await createNotification({
    userId,
    message: verified ? 'Your account has been verified.' : 'Account verification has been revoked.',
    type: verified ? 'user_verified' : 'verification_revoked',
  });
}

export async function getAllUsers() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
