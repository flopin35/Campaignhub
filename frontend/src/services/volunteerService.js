import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/auth';
import { createNotification } from './notificationService';

const VOLUNTEERS = 'volunteers';

export const VOLUNTEER_STATUSES = ['pending', 'approved', 'active', 'inactive'];

export function subscribeVolunteers(campaignId, callback) {
  const q = query(
    collection(db, VOLUNTEERS),
    where('campaignId', '==', campaignId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => callback([])
  );
}

export async function registerVolunteer({
  campaignId,
  campaignTitle,
  ownerId,
  userId = null,
  name,
  phone,
  email = '',
  region = '',
  constituency = '',
  skills = [],
  availability = '',
}) {
  const data = {
    campaignId,
    userId,
    name: name.trim(),
    phone: phone.trim(),
    email: email.trim(),
    region,
    constituency,
    skills,
    availability,
    status: 'pending',
    tasksCompleted: 0,
    eventsAttended: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, VOLUNTEERS), data);

  if (ownerId) {
    await createNotification({
      userId: ownerId,
      message: `New volunteer application: ${name} for "${campaignTitle}"`,
      type: 'volunteer_pending',
      campaignId,
    }).catch(() => {});
  }

  return { id: ref.id, ...data };
}

export async function updateVolunteerStatus(volunteerId, status) {
  await updateDoc(doc(db, VOLUNTEERS, volunteerId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export function getVolunteerStats(volunteers = []) {
  return {
    total: volunteers.length,
    pending: volunteers.filter((v) => v.status === 'pending').length,
    active: volunteers.filter((v) => v.status === 'active' || v.status === 'approved').length,
    byRegion: volunteers.reduce((map, v) => {
      const r = v.region || 'Unknown';
      map[r] = (map[r] || 0) + 1;
      return map;
    }, {}),
  };
}
