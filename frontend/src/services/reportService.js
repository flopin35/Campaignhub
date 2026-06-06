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
} from 'firebase/firestore';
import { db } from '../firebase/auth';

const REPORTS = 'reports';

export async function reportCampaign({ campaignId, reporterId, reason, details = '' }) {
  await addDoc(collection(db, REPORTS), {
    type: 'campaign',
    targetId: campaignId,
    campaignId,
    reporterId,
    reason,
    details,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

export async function reportComment({ commentId, campaignId, reporterId, reason, details = '' }) {
  await addDoc(collection(db, REPORTS), {
    type: 'comment',
    targetId: commentId,
    campaignId,
    reporterId,
    reason,
    details,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

export function subscribeReports(callback) {
  const q = query(collection(db, REPORTS), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => callback([]));
}

export async function resolveReport(reportId, action = 'resolved') {
  await updateDoc(doc(db, REPORTS, reportId), {
    status: action,
    resolvedAt: serverTimestamp(),
  });
}
