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
  increment,
} from 'firebase/firestore';
import { db } from '../firebase/auth';

const EVENTS = 'campaign_events';

export function subscribeEvents(campaignId, callback) {
  const q = query(
    collection(db, EVENTS),
    where('campaignId', '==', campaignId),
    orderBy('eventDate', 'asc')
  );
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => callback([])
  );
}

export async function createEvent({
  campaignId,
  title,
  description = '',
  venue = '',
  region = '',
  constituency = '',
  eventDate,
}) {
  const data = {
    campaignId,
    title: title.trim(),
    description,
    venue,
    region,
    constituency,
    eventDate,
    rsvpCount: 0,
    checkInCount: 0,
    status: 'scheduled',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, EVENTS), data);
  return { id: ref.id, ...data };
}

export async function rsvpEvent(eventId) {
  await updateDoc(doc(db, EVENTS, eventId), {
    rsvpCount: increment(1),
    updatedAt: serverTimestamp(),
  });
}

export async function checkInEvent(eventId) {
  await updateDoc(doc(db, EVENTS, eventId), {
    checkInCount: increment(1),
    updatedAt: serverTimestamp(),
  });
}

export async function getUpcomingEvents(campaignId) {
  const q = query(
    collection(db, EVENTS),
    where('campaignId', '==', campaignId),
    orderBy('eventDate', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
