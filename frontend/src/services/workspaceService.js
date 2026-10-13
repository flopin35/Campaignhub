/**
 * Firestore access for CampaignHub Pro workspace modules.
 * New collections are queried by campaignId only (no orderBy) so no composite
 * indexes are needed — rows are sorted client-side.
 */
import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { db } from '../firebase/auth';
import { toMs } from '../utils/billing';
import { normalizePhone, randomToken, shortCode } from '../utils/format';

const byCreatedDesc = (a, b) => toMs(b.createdAt) - toMs(a.createdAt);

function subscribeByCampaign(name, campaignId, cb, sort = byCreatedDesc) {
  const q = query(collection(db, name), where('campaignId', '==', campaignId));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(sort)),
    (err) => {
      console.warn(`[${name}] subscription error:`, err.code || err.message);
      cb([]);
    },
  );
}

/* ------------------------------------------------------------------ */
/* Voters (supporters collection)                                      */
/* ------------------------------------------------------------------ */

const VOTER_FIELDS = [
  'name', 'phone', 'email', 'region', 'constituency', 'electoralArea', 'pollingStation',
  'gender', 'ageGroup', 'supportLevel', 'tags', 'notes', 'isVolunteer',
];

function cleanVoter(input = {}) {
  const out = {};
  VOTER_FIELDS.forEach((k) => {
    if (input[k] === undefined) return;
    if (k === 'tags') {
      out.tags = (Array.isArray(input.tags) ? input.tags : String(input.tags || '').split(','))
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 12);
    } else if (k === 'phone') {
      out.phone = normalizePhone(input.phone);
    } else if (typeof input[k] === 'string') {
      out[k] = input[k].trim().slice(0, k === 'notes' ? 1000 : 120);
    } else {
      out[k] = input[k];
    }
  });
  return out;
}

export async function addVoter(campaignId, input, { source = 'manual', collectedBy = '' } = {}) {
  const data = cleanVoter(input);
  if (!data.name) throw new Error('Name is required');
  if (!data.phone || data.phone.length < 9) throw new Error('Enter a valid phone number');
  const payload = {
    campaignId,
    userId: null,
    email: '',
    region: '',
    constituency: '',
    pollingStation: '',
    supportLevel: 'unknown',
    tags: [],
    interests: [],
    isVolunteer: false,
    totalDonated: 0,
    donationCount: 0,
    eventsAttended: 0,
    contactCount: 0,
    ...data,
    source,
    collectedBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, 'supporters'), payload);
  return { id: ref.id, ...payload };
}

export async function updateVoter(id, input) {
  await updateDoc(doc(db, 'supporters', id), { ...cleanVoter(input), updatedAt: serverTimestamp() });
}

export async function deleteVoter(id) {
  await deleteDoc(doc(db, 'supporters', id));
}

/** Record a contact attempt (door, call, WhatsApp…) and optionally update support level. */
export async function logVoterContact(voter, { method, supportLevel, note }) {
  const updates = {
    lastContactAt: serverTimestamp(),
    lastContactMethod: method || 'door',
    contactCount: increment(1),
    updatedAt: serverTimestamp(),
  };
  if (supportLevel) updates.supportLevel = supportLevel;
  if (note) updates.notes = [voter.notes, `${new Date().toLocaleDateString('en-GH')}: ${note}`].filter(Boolean).join('\n').slice(-1000);
  await updateDoc(doc(db, 'supporters', voter.id), updates);
}

/** Bulk import (CSV). Skips phones already in the list. Writes in batches of 400. */
export async function importVoters(campaignId, rows, existing = [], onProgress) {
  const seen = new Set(existing.map((v) => normalizePhone(v.phone)));
  const clean = [];
  let skipped = 0;
  rows.forEach((r) => {
    const v = cleanVoter(r);
    if (!v.name || !v.phone || v.phone.length < 9 || seen.has(v.phone)) {
      skipped += 1;
      return;
    }
    seen.add(v.phone);
    clean.push(v);
  });

  let written = 0;
  for (let i = 0; i < clean.length; i += 400) {
    const batch = writeBatch(db);
    clean.slice(i, i + 400).forEach((v) => {
      const ref = doc(collection(db, 'supporters'));
      batch.set(ref, {
        campaignId,
        userId: null,
        email: '',
        region: '',
        constituency: '',
        pollingStation: '',
        supportLevel: 'unknown',
        tags: [],
        interests: [],
        isVolunteer: false,
        totalDonated: 0,
        donationCount: 0,
        eventsAttended: 0,
        contactCount: 0,
        ...v,
        source: 'import',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    // eslint-disable-next-line no-await-in-loop
    await batch.commit();
    written += Math.min(400, clean.length - i);
    onProgress?.(written, clean.length);
  }
  return { imported: written, skipped };
}

/* ------------------------------------------------------------------ */
/* Ads manager                                                         */
/* ------------------------------------------------------------------ */

export const AD_CHANNELS = [
  { id: 'facebook', label: 'Facebook / Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'google', label: 'Google / YouTube' },
  { id: 'x', label: 'X (Twitter)' },
  { id: 'whatsapp', label: 'WhatsApp status / groups' },
  { id: 'radio', label: 'Radio' },
  { id: 'tv', label: 'TV' },
  { id: 'billboard', label: 'Billboard' },
  { id: 'posters', label: 'Posters & flyers' },
  { id: 'vehicle', label: 'Vehicle branding / PA van' },
  { id: 'influencer', label: 'Influencer / blogger' },
  { id: 'other', label: 'Other' },
];

export function subscribeAds(campaignId, cb) {
  return subscribeByCampaign('ad_campaigns', campaignId, cb);
}

export async function createAd(campaignId, input) {
  const code = shortCode(6);
  const payload = {
    campaignId,
    code,
    name: String(input.name || '').trim().slice(0, 80) || 'Untitled ad',
    channel: input.channel || 'facebook',
    budget: Number(input.budget) || 0,
    spent: Number(input.spent) || 0,
    startDate: input.startDate || '',
    endDate: input.endDate || '',
    region: input.region || '',
    audience: String(input.audience || '').slice(0, 200),
    notes: String(input.notes || '').slice(0, 500),
    reach: Number(input.reach) || 0,
    status: input.status || 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, 'ad_campaigns'), payload);
  return { id: ref.id, ...payload };
}

export async function updateAd(id, input) {
  const patch = { updatedAt: serverTimestamp() };
  ['name', 'channel', 'startDate', 'endDate', 'region', 'audience', 'notes', 'status'].forEach((k) => {
    if (input[k] !== undefined) patch[k] = input[k];
  });
  ['budget', 'spent', 'reach'].forEach((k) => {
    if (input[k] !== undefined) patch[k] = Number(input[k]) || 0;
  });
  await updateDoc(doc(db, 'ad_campaigns', id), patch);
}

export async function deleteAd(id) {
  await deleteDoc(doc(db, 'ad_campaigns', id));
}

/* ------------------------------------------------------------------ */
/* Polling stations, field links, results                              */
/* ------------------------------------------------------------------ */

export function subscribeStations(campaignId, cb) {
  return subscribeByCampaign('polling_stations', campaignId, cb, (a, b) => String(a.code || a.name).localeCompare(String(b.code || b.name)));
}

export async function saveStation(campaignId, input, id) {
  const payload = {
    campaignId,
    code: String(input.code || '').trim().toUpperCase().slice(0, 30),
    name: String(input.name || '').trim().slice(0, 120),
    electoralArea: String(input.electoralArea || '').trim().slice(0, 80),
    constituency: String(input.constituency || '').trim().slice(0, 80),
    registeredVoters: Number(input.registeredVoters) || 0,
    agentName: String(input.agentName || '').trim().slice(0, 80),
    agentPhone: normalizePhone(input.agentPhone || ''),
    updatedAt: serverTimestamp(),
  };
  if (!payload.name) throw new Error('Polling station name is required');
  if (id) {
    await updateDoc(doc(db, 'polling_stations', id), payload);
    return { id, ...payload };
  }
  const ref = await addDoc(collection(db, 'polling_stations'), { ...payload, createdAt: serverTimestamp() });
  return { id: ref.id, ...payload };
}

export async function importStations(campaignId, rows) {
  let count = 0;
  for (let i = 0; i < rows.length; i += 400) {
    const batch = writeBatch(db);
    rows.slice(i, i + 400).forEach((r) => {
      if (!r.name) return;
      batch.set(doc(collection(db, 'polling_stations')), {
        campaignId,
        code: String(r.code || '').trim().toUpperCase().slice(0, 30),
        name: String(r.name).trim().slice(0, 120),
        electoralArea: String(r.electoralArea || '').trim().slice(0, 80),
        constituency: String(r.constituency || '').trim().slice(0, 80),
        registeredVoters: Number(r.registeredVoters) || 0,
        agentName: String(r.agentName || '').trim().slice(0, 80),
        agentPhone: normalizePhone(r.agentPhone || ''),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      count += 1;
    });
    // eslint-disable-next-line no-await-in-loop
    await batch.commit();
  }
  return count;
}

export async function deleteStation(id) {
  await deleteDoc(doc(db, 'polling_stations', id));
}

export function subscribeFieldLinks(campaignId, cb) {
  return subscribeByCampaign('field_links', campaignId, cb);
}

/**
 * Create a no-login link for a field worker.
 * mode: 'canvass' (log voter contacts) | 'results' (submit polling-station results)
 */
export async function createFieldLink(campaign, { mode, agentName, agentPhone, station }) {
  const token = randomToken(24);
  const payload = {
    campaignId: campaign.id,
    campaignTitle: campaign.title || '',
    campaignSlug: campaign.slug || '',
    candidateName: campaign.candidateName || campaign.ownerName || '',
    mode: mode === 'results' ? 'results' : 'canvass',
    agentName: String(agentName || '').trim().slice(0, 80),
    agentPhone: normalizePhone(agentPhone || ''),
    stationId: station?.id || '',
    stationName: station?.name || '',
    stationCode: station?.code || '',
    candidates: Array.isArray(campaign.electionCandidates) && campaign.electionCandidates.length
      ? campaign.electionCandidates
      : [campaign.candidateName || campaign.title || 'Our candidate'],
    region: campaign.region || '',
    constituency: campaign.constituency || '',
    active: true,
    submissions: 0,
    createdAt: serverTimestamp(),
  };
  await setDoc(doc(db, 'field_links', token), payload);
  return { id: token, ...payload };
}

export async function setFieldLinkActive(token, active) {
  await updateDoc(doc(db, 'field_links', token), { active: !!active });
}

export async function deleteFieldLink(token) {
  await deleteDoc(doc(db, 'field_links', token));
}

export async function getFieldLink(token) {
  const snap = await getDoc(doc(db, 'field_links', token));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function subscribeResults(campaignId, cb) {
  return subscribeByCampaign('election_results', campaignId, cb);
}

/** Submit results from a field link (agent) or the dashboard (owner). */
export async function submitResult({ campaignId, token = '', station, votes, rejected = 0, totalCast = 0, note = '', submittedBy = '' }) {
  const cleanVotes = {};
  Object.entries(votes || {}).forEach(([k, v]) => {
    cleanVotes[String(k).slice(0, 80)] = Math.max(0, Math.floor(Number(v) || 0));
  });
  const payload = {
    campaignId,
    token,
    stationId: station?.id || '',
    stationName: station?.name || '',
    stationCode: station?.code || '',
    votes: cleanVotes,
    rejected: Math.max(0, Math.floor(Number(rejected) || 0)),
    totalCast: Math.max(0, Math.floor(Number(totalCast) || 0)),
    note: String(note || '').slice(0, 300),
    submittedBy: String(submittedBy || '').slice(0, 80),
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, 'election_results'), payload);
  return { id: ref.id, ...payload };
}

export async function deleteResult(id) {
  await deleteDoc(doc(db, 'election_results', id));
}

/** Latest submission per station wins (agents can correct mistakes by resubmitting). */
export function latestResultsByStation(results = []) {
  const map = new Map();
  [...results].sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt)).forEach((r) => {
    map.set(r.stationId || r.stationName, r);
  });
  return map;
}

/* ------------------------------------------------------------------ */
/* Issue poll                                                          */
/* ------------------------------------------------------------------ */

export function subscribePollResponses(campaignId, cb) {
  return subscribeByCampaign('poll_responses', campaignId, cb);
}

export async function submitPollResponse({ campaignId, option, region = '', pollId = 'default' }) {
  await addDoc(collection(db, 'poll_responses'), {
    campaignId,
    pollId,
    option: String(option).slice(0, 80),
    region: String(region || '').slice(0, 40),
    createdAt: serverTimestamp(),
  });
}

/* ------------------------------------------------------------------ */
/* Broadcast log                                                       */
/* ------------------------------------------------------------------ */

export function subscribeBroadcasts(campaignId, cb) {
  return subscribeByCampaign('broadcasts', campaignId, cb);
}

export async function logBroadcast(campaignId, { channel, message, audienceLabel, recipients }) {
  await addDoc(collection(db, 'broadcasts'), {
    campaignId,
    channel,
    message: String(message || '').slice(0, 2000),
    audienceLabel: String(audienceLabel || '').slice(0, 120),
    recipients: Number(recipients) || 0,
    createdAt: serverTimestamp(),
  });
}

/* ------------------------------------------------------------------ */
/* Events (existing campaign_events collection)                        */
/* ------------------------------------------------------------------ */

export const EVENT_TYPES = ['Rally', 'Town hall', 'Door-to-door', 'Fundraiser', 'Community visit', 'Media / interview', 'Meeting'];

export async function saveEvent(campaignId, input, id) {
  const payload = {
    title: String(input.title || '').trim().slice(0, 120),
    description: String(input.description || '').slice(0, 1000),
    type: input.type || 'Rally',
    venue: String(input.venue || '').slice(0, 160),
    region: input.region || '',
    constituency: String(input.constituency || '').slice(0, 80),
    eventDate: input.eventDate,
    expected: Number(input.expected) || 0,
    isPublic: input.isPublic !== false,
    updatedAt: serverTimestamp(),
  };
  if (!payload.title || !payload.eventDate) throw new Error('Title and date are required');
  if (id) {
    await updateDoc(doc(db, 'campaign_events', id), payload);
    return id;
  }
  const ref = await addDoc(collection(db, 'campaign_events'), {
    ...payload,
    campaignId,
    rsvpCount: 0,
    checkInCount: 0,
    status: 'scheduled',
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteEvent(id) {
  await deleteDoc(doc(db, 'campaign_events', id));
}

export async function bumpEventCheckIn(id, delta = 1) {
  await updateDoc(doc(db, 'campaign_events', id), { checkInCount: increment(delta), updatedAt: serverTimestamp() });
}

export async function getPublicEvents(campaignId) {
  const snap = await getDocs(query(collection(db, 'campaign_events'), where('campaignId', '==', campaignId)));
  const now = Date.now() - 6 * 3600000;
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((e) => e.isPublic !== false && new Date(e.eventDate).getTime() >= now)
    .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
}

/* ------------------------------------------------------------------ */
/* Billing history                                                     */
/* ------------------------------------------------------------------ */

export function subscribeTransactions(campaignId, uid, cb) {
  const q = query(
    collection(db, 'billing_transactions'),
    where('campaignId', '==', campaignId),
    where('userId', '==', uid),
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byCreatedDesc)),
    () => cb([]),
  );
}
