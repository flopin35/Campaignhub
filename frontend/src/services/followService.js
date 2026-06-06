import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  getCountFromServer,
  increment,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/auth';
import { createNotification } from './notificationService';

const FOLLOWERS = 'followers';

function followDocId(campaignId, userId) {
  return `${campaignId}_${userId}`;
}

export async function followCampaign(campaignId, userId, campaignTitle, ownerId) {
  const id = followDocId(campaignId, userId);
  await setDoc(doc(db, FOLLOWERS, id), {
    campaignId,
    userId,
    followedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'campaigns', campaignId), {
    followerCount: increment(1),
    updatedAt: serverTimestamp(),
  }).catch(() => {});
  if (ownerId && ownerId !== userId) {
    await createNotification({
      userId: ownerId,
      message: `New supporter for "${campaignTitle}"`,
      type: 'new_follower',
      campaignId,
    });
  }
}

export async function unfollowCampaign(campaignId, userId) {
  const id = followDocId(campaignId, userId);
  await deleteDoc(doc(db, FOLLOWERS, id));
  await updateDoc(doc(db, 'campaigns', campaignId), {
    followerCount: increment(-1),
    updatedAt: serverTimestamp(),
  }).catch(() => {});
}

export async function isFollowing(campaignId, userId) {
  if (!userId) return false;
  const snap = await getDoc(doc(db, FOLLOWERS, followDocId(campaignId, userId)));
  return snap.exists();
}

export function subscribeFollowStatus(campaignId, userId, callback) {
  if (!userId) {
    callback(false);
    return () => {};
  }
  return onSnapshot(doc(db, FOLLOWERS, followDocId(campaignId, userId)), (snap) => {
    callback(snap.exists());
  });
}

export function subscribeFollowerCount(campaignId, callback) {
  const q = query(collection(db, FOLLOWERS), where('campaignId', '==', campaignId));
  return onSnapshot(q, (snap) => callback(snap.size), () => callback(0));
}

export async function getFollowerCount(campaignId) {
  const q = query(collection(db, FOLLOWERS), where('campaignId', '==', campaignId));
  const snap = await getCountFromServer(q);
  return snap.data().count;
}
