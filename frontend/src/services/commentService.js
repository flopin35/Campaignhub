import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  increment,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/auth';

const COMMENTS = 'comments';

export function subscribeComments(campaignId, callback) {
  const q = query(
    collection(db, COMMENTS),
    where('campaignId', '==', campaignId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => {
      const comments = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((c) => !c.hidden);
      callback(comments);
    },
    () => callback([])
  );
}

export async function addComment({ campaignId, userId, userName, text }) {
  await addDoc(collection(db, COMMENTS), {
    campaignId,
    userId,
    userName,
    text: text.trim(),
    likes: 0,
    hidden: false,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'campaigns', campaignId), {
    commentCount: increment(1),
    updatedAt: serverTimestamp(),
  }).catch(() => {});
}

export async function deleteComment(commentId, campaignId) {
  await deleteDoc(doc(db, COMMENTS, commentId));
  await updateDoc(doc(db, 'campaigns', campaignId), {
    commentCount: increment(-1),
    updatedAt: serverTimestamp(),
  }).catch(() => {});
}

export async function hideComment(commentId) {
  await updateDoc(doc(db, COMMENTS, commentId), { hidden: true });
}

export async function likeComment(commentId) {
  await updateDoc(doc(db, COMMENTS, commentId), { likes: increment(1) });
}

export function subscribeAllComments(callback) {
  const q = query(collection(db, COMMENTS), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}
