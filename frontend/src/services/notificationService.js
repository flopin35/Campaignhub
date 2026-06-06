import {
  collection,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase/auth';

/** Create notification with optional type and campaign link */
export async function createNotification({ userId, message, type = 'general', campaignId = null, read = false }) {
  await addDoc(collection(db, 'notifications'), {
    userId,
    message,
    type,
    campaignId,
    read,
    createdAt: serverTimestamp(),
  });
}

/** @deprecated Use createNotification({ userId, message }) */
export async function createLegacyNotification(userId, message) {
  return createNotification({ userId, message });
}

export function subscribeToNotifications(userId, callback) {
  if (!userId) return () => {};
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => callback([])
  );
}

export async function markNotificationRead(notificationId) {
  await updateDoc(doc(db, 'notifications', notificationId), { read: true });
}

export async function markAllNotificationsRead(userId) {
  const q = query(collection(db, 'notifications'), where('userId', '==', userId), where('read', '==', false));
  const snap = await getDocs(q);
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(doc(db, 'notifications', d.id), { read: true }));
  await batch.commit();
}
