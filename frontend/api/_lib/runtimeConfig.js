/**
 * Settings saved from Admin → Setup live in Firestore (config/secrets, server-only by the rules).
 * Values set in Vercel always win; anything missing there is filled from Firestore.
 * This keeps keys out of the code and the git repository.
 */
import { getFirebaseAdmin } from './otpHelpers.js';

export const RUNTIME_KEYS = [
  'APP_URL',
  'PAYSTACK_SECRET_KEY',
  'PAYSTACK_PLAN_MONTHLY',
  'PAYSTACK_PLAN_YEARLY',
  'FLW_SECRET_KEY',
  'FLW_WEBHOOK_HASH',
  'META_APP_ID',
  'META_APP_SECRET',
  'META_TOKEN_KEY',
  'META_LOGIN_CONFIG_ID',
  'OPENAI_API_KEY',
  'GEMINI_API_KEY',
];

const fromStore = new Set();
let loadedAt = 0;

export function settingSource(key) {
  if (!process.env[key]) return null;
  return fromStore.has(key) ? 'app' : 'vercel';
}

export async function loadRuntimeConfig({ force = false } = {}) {
  if (!force && Date.now() - loadedAt < 60000) return;
  loadedAt = Date.now();
  try {
    const admin = await getFirebaseAdmin();
    if (!admin) return;
    const snap = await admin.db.collection('config').doc('secrets').get();
    const data = snap.exists ? snap.data() : {};
    RUNTIME_KEYS.forEach((k) => {
      const v = data[k];
      if (v && (!process.env[k] || fromStore.has(k))) {
        process.env[k] = String(v);
        fromStore.add(k);
      } else if (!v && fromStore.has(k)) {
        delete process.env[k];
        fromStore.delete(k);
      }
    });
  } catch (err) {
    console.error('[config] could not load app settings', err.message);
  }
}
