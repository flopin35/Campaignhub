import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/auth';
import { createNotification } from './notificationService';

const SUPPORTERS = 'supporters';

export function subscribeSupporters(campaignId, callback) {
  const q = query(
    collection(db, SUPPORTERS),
    where('campaignId', '==', campaignId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => callback([])
  );
}

export async function getSupporters(campaignId) {
  const q = query(
    collection(db, SUPPORTERS),
    where('campaignId', '==', campaignId),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function registerSupporter({
  campaignId,
  campaignTitle,
  ownerId,
  userId = null,
  name,
  phone,
  email = '',
  region = '',
  constituency = '',
  interests = [],
  isVolunteer = false,
  source = 'campaign_page',
}) {
  const payload = {
    campaignId,
    userId,
    name: name.trim(),
    phone: phone.trim(),
    email: email.trim(),
    region,
    constituency,
    interests,
    isVolunteer,
    volunteerStatus: isVolunteer ? 'pending' : null,
    totalDonated: 0,
    donationCount: 0,
    eventsAttended: 0,
    source,
    tags: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, SUPPORTERS), payload);

  const { trackLeadSignup } = await import('./analyticsService');
  await trackLeadSignup(campaignId).catch(() => {});

  if (ownerId) {
    await createNotification({
      userId: ownerId,
      message: `New supporter: ${name}${region ? ` (${region})` : ''} signed up on "${campaignTitle}"`,
      type: 'new_supporter',
      campaignId,
    }).catch(() => {});
  }

  return { id: ref.id, ...payload };
}

export async function updateSupporter(supporterId, updates) {
  await updateDoc(doc(db, SUPPORTERS, supporterId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export function aggregateSupportersByRegion(supporters = []) {
  const map = {};
  supporters.forEach((s) => {
    const key = s.region || 'Unknown';
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map)
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count);
}

export function aggregateSupportersByConstituency(supporters = []) {
  const map = {};
  supporters.forEach((s) => {
    if (!s.constituency) return;
    map[s.constituency] = (map[s.constituency] || 0) + 1;
  });
  return Object.entries(map)
    .map(([constituency, count]) => ({ constituency, count }))
    .sort((a, b) => b.count - a.count);
}
