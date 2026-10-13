/**
 * One-time fix: activate free campaigns stuck in pending_review.
 * Usage: node scripts/activatePendingFreeCampaigns.js
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const PROJECT_ID = 'new1-e94db';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function loadCredentials() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }
  const candidates = [
    join(root, 'new1-e94db-firebase-adminsdk-fbsvc-3a57a37b7e.json'),
    join(root, 'firebase', 'service-account.json'),
  ];
  for (const path of candidates) {
    if (existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'));
  }
  throw new Error('Service account JSON not found.');
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const cred = loadCredentials();
admin.initializeApp({ credential: admin.credential.cert(cred), projectId: PROJECT_ID });
const db = admin.firestore();

const snap = await db.collection('campaigns').where('status', '==', 'pending_review').get();
let updated = 0;

for (const doc of snap.docs) {
  const data = doc.data();
  const isFree = data.packageType === 'free' || data.packagePrice === 0;
  if (!isFree) continue;

  const days = data.durationDays || 14;
  const start = new Date();
  const end = addDays(start, days);
  await doc.ref.update({
    status: 'active',
    startDate: admin.firestore.Timestamp.fromDate(start),
    endDate: admin.firestore.Timestamp.fromDate(end),
    expiresAt: admin.firestore.Timestamp.fromDate(end),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log(`✓ Activated: ${data.title} (${doc.id})`);
  updated++;
}

console.log(updated ? `\nActivated ${updated} campaign(s).` : '\nNo pending free campaigns found.');
