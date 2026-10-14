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
import { normalizePhone, isValidPhone, randomToken, shortCode } from '../utils/format';
import { getBillingConfig } from './billingService';

/**
 * Right after a deploy the server publishes the new security rules (see api/_lib/autoSetup.js).
 * If a save lands before that, wake the server and show a clear message instead of
 * Firebase's "Missing or insufficient permissions".
 */
async function guardWrite(fn) {
  try {
    return await fn();
  } catch (err) {
    if (err?.code !== 'permission-denied') throw err;
    getBillingConfig({ fresh: true }).catch(() => null);
    const friendly = new Error('CampaignHub is finishing a security update. Please try again in a minute. If this keeps happening, check that this page’s Pro plan or free trial is active.');
    friendly.code = 'permission-denied';
    throw friendly;
  }
}

/**
 * Security rules look up the campaign for every document in a batch, and Firestore allows
 * only 20 such look-ups per batch — so owner imports are written in small batches, 4 at a time.
 */
async function commitInChunks(items, size, write, onProgress) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  let done = 0;
  for (let i = 0; i < chunks.length; i += 4) {
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(chunks.slice(i, i + 4).map(async (chunk) => {
      const batch = writeBatch(db);
      chunk.forEach((item) => write(batch, item));
      await batch.commit();
      done += chunk.length;
      onProgress?.(done, items.length);
    }));
  }
  return done;
}

export const SUPPORT_LEVEL_VALUES = ['strong', 'leaning', 'undecided', 'opposed', 'unknown'];

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
    } else if (k === 'supportLevel') {
      if (SUPPORT_LEVEL_VALUES.includes(input.supportLevel)) out.supportLevel = input.supportLevel;
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
  if (!isValidPhone(data.phone)) throw new Error('Enter a valid phone number (e.g. 024 123 4567)');
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
  const ref = await guardWrite(() => addDoc(collection(db, 'supporters'), payload));
  return { id: ref.id, ...payload };
}

export async function updateVoter(id, input) {
  await guardWrite(() => updateDoc(doc(db, 'supporters', id), { ...cleanVoter(input), updatedAt: serverTimestamp() }));
}

export async function deleteVoter(id) {
  await guardWrite(() => deleteDoc(doc(db, 'supporters', id)));
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
  await guardWrite(() => updateDoc(doc(db, 'supporters', voter.id), updates));
}

/** Bulk import (CSV). Skips invalid phones and phones already in the list. */
export async function importVoters(campaignId, rows, existing = [], onProgress) {
  const seen = new Set(existing.map((v) => normalizePhone(v.phone)));
  const clean = [];
  let skipped = 0;
  rows.forEach((r) => {
    const v = cleanVoter(r);
    if (!v.name || !isValidPhone(v.phone) || seen.has(v.phone)) {
      skipped += 1;
      return;
    }
    seen.add(v.phone);
    clean.push(v);
  });

  const written = await commitInChunks(clean, 10, (batch, v) => {
    batch.set(doc(collection(db, 'supporters')), {
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
  }, onProgress);
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
  const ref = await guardWrite(() => addDoc(collection(db, 'ad_campaigns'), payload));
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
  await guardWrite(() => updateDoc(doc(db, 'ad_campaigns', id), patch));
}

export async function deleteAd(id) {
  await guardWrite(() => deleteDoc(doc(db, 'ad_campaigns', id)));
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
    await guardWrite(() => updateDoc(doc(db, 'polling_stations', id), payload));
    return { id, ...payload };
  }
  const ref = await guardWrite(() => addDoc(collection(db, 'polling_stations'), { ...payload, createdAt: serverTimestamp() }));
  return { id: ref.id, ...payload };
}

export async function importStations(campaignId, rows) {
  const valid = rows.filter((r) => r.name && String(r.name).trim());
  // Each station is checked for "owner + Pro" (2 look-ups), so 9 per batch stays under the limit.
  return commitInChunks(valid, 9, (batch, r) => {
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
  });
}

export async function deleteStation(id) {
  await guardWrite(() => deleteDoc(doc(db, 'polling_stations', id)));
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
  await guardWrite(() => setDoc(doc(db, 'field_links', token), payload));
  return { id: token, ...payload };
}

export async function setFieldLinkActive(token, active) {
  await guardWrite(() => updateDoc(doc(db, 'field_links', token), { active: !!active }));
}

export async function deleteFieldLink(token) {
  await guardWrite(() => deleteDoc(doc(db, 'field_links', token)));
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
  await guardWrite(() => deleteDoc(doc(db, 'election_results', id)));
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
    await guardWrite(() => updateDoc(doc(db, 'campaign_events', id), payload));
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
  await guardWrite(() => deleteDoc(doc(db, 'campaign_events', id)));
}

export async function bumpEventCheckIn(id, delta = 1) {
  await guardWrite(() => updateDoc(doc(db, 'campaign_events', id), { checkInCount: increment(delta), updatedAt: serverTimestamp() }));
}

export async function getPublicEvents(campaignId) {
  // Security rules only let visitors read events marked public, so the query must ask for exactly those.
  const snap = await getDocs(query(
    collection(db, 'campaign_events'),
    where('campaignId', '==', campaignId),
    where('isPublic', '==', true),
  ));
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
