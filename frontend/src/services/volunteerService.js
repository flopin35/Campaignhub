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
import { normalizePhone, isValidPhone } from '../utils/format';

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
  if (!String(name || '').trim()) throw new Error('Enter your name.');
  if (!isValidPhone(phone)) throw new Error('Enter a valid phone number (e.g. 024 123 4567).');
  const data = {
    campaignId,
    userId,
    name: String(name).trim().slice(0, 120),
    phone: normalizePhone(phone),
    email: String(email || '').trim().slice(0, 160),
    region: String(region || '').slice(0, 80),
    constituency: String(constituency || '').slice(0, 120),
    skills: Array.isArray(skills) ? skills.slice(0, 12) : [],
    availability: String(availability || '').slice(0, 120),
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
      message: `New volunteer application: ${data.name} for "${campaignTitle}"`.slice(0, 300),
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
