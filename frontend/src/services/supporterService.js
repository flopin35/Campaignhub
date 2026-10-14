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
import { normalizePhone, isValidPhone } from '../utils/format';

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
  pollingStation = '',
  supportLevel = 'leaning',
  adCode = '',
  collectedBy = '',
  notes = '',
  fieldToken = '',
}) {
  if (!String(name || '').trim()) throw new Error('Enter your name.');
  if (!isValidPhone(phone)) throw new Error('Enter a valid phone number (e.g. 024 123 4567).');
  const payload = {
    campaignId,
    userId,
    name: String(name).trim().slice(0, 120),
    phone: normalizePhone(phone),
    email: String(email || '').trim().slice(0, 160),
    region: String(region || '').slice(0, 80),
    constituency: String(constituency || '').slice(0, 120),
    pollingStation: String(pollingStation || '').trim().slice(0, 120),
    supportLevel: ['strong', 'leaning', 'undecided', 'opposed', 'unknown'].includes(supportLevel) ? supportLevel : 'unknown',
    interests: Array.isArray(interests) ? interests.slice(0, 12) : [],
    isVolunteer,
    adCode: String(adCode || '').slice(0, 12),
    collectedBy: String(collectedBy || '').slice(0, 80),
    fieldToken: fieldToken || '',
    notes: String(notes || '').slice(0, 1000),
    contactCount: source === 'field' ? 1 : 0,
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

  if (source !== 'field') {
    const { trackLeadSignup } = await import('./analyticsService');
    await trackLeadSignup(campaignId, adCode).catch(() => {});
  }

  if (ownerId && source !== 'field') {
    await createNotification({
      userId: ownerId,
      message: `New supporter: ${payload.name}${payload.region ? ` (${payload.region})` : ''} signed up on "${campaignTitle}"`.slice(0, 300),
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
