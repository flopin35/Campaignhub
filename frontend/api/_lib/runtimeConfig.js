/**
 * Settings saved from Admin → Setup live in Firestore (config/secrets, server-only by the rules).
 * Values set in Vercel always win; anything missing there is filled from Firestore.
 * This keeps keys out of the code and the git repository.
 */
import { getFirebaseAdmin } from './otpHelpers.js';
import { ensureAutoSetup } from './autoSetup.js';

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
  if (discovered.has(key)) return 'paystack';
  return fromStore.has(key) ? 'app' : 'vercel';
}

export async function loadRuntimeConfig({ force = false } = {}) {
  if (!force && Date.now() - loadedAt < 60000) return;
  loadedAt = Date.now();
  let admin = null;
  try {
    admin = await getFirebaseAdmin();
    const snap = admin ? await admin.db.collection('config').doc('secrets').get() : null;
    const data = snap?.exists ? snap.data() : {};
    RUNTIME_KEYS.forEach((k) => {
      const v = data[k];
      if (v && (!process.env[k] || fromStore.has(k) || discovered.has(k))) {
        process.env[k] = String(v);
        fromStore.add(k);
        discovered.delete(k);
      } else if (!v && fromStore.has(k)) {
        delete process.env[k];
        fromStore.delete(k);
      }
    });
  } catch (err) {
    console.error('[config] could not load app settings', err.message);
  }
  await discoverPaystackPlans();
  if (admin) await ensureAutoSetup(admin); // publishes new security rules after a deploy
}

/*
 * Card auto-renew needs the Paystack plan codes. Nobody should have to copy them by hand:
 * when PAYSTACK_PLAN_MONTHLY / PAYSTACK_PLAN_YEARLY are not set, find the matching plans in the
 * Paystack account (GHS, ₵120 monthly / ₵1,200 annually) and create any that are missing.
 * Plan codes are not secret. Values set in Vercel or Admin → Setup always win.
 */
const PLAN_SPECS = [
  { env: 'PAYSTACK_PLAN_MONTHLY', name: 'CampaignHub Pro — Monthly', amount: 12000, interval: 'monthly' },
  { env: 'PAYSTACK_PLAN_YEARLY', name: 'CampaignHub Pro — Yearly', amount: 120000, interval: 'annually' },
];
const discovered = new Set();
let planRetryAt = 0;
let planLookup = null;

async function paystackCall(path, secret, { method = 'GET', payload } = {}) {
  const r = await fetch(`https://api.paystack.co${path}`, {
    method,
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: payload ? JSON.stringify(payload) : undefined,
    signal: AbortSignal.timeout(6000),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.status) throw new Error(data.message || `Paystack ${r.status}`);
  return data.data;
}

export async function discoverPaystackPlans() {
  const secret = (process.env.PAYSTACK_SECRET_KEY || '').trim();
  const missing = PLAN_SPECS.filter((p) => !(process.env[p.env] || '').trim());
  missing.forEach((p) => discovered.delete(p.env));
  if (!secret || !missing.length || Date.now() < planRetryAt) return;
  if (planLookup) return planLookup; // one lookup at a time per instance
  planLookup = (async () => {
    try {
      const plans = (await paystackCall('/plan?perPage=100', secret)) || [];
      for (const spec of missing) {
        const found = plans.find((p) => Number(p.amount) === spec.amount
          && p.interval === spec.interval
          && String(p.currency || '').toUpperCase() === 'GHS'
          && !p.is_deleted && !p.is_archived);
        const code = found?.plan_code
          || (await paystackCall('/plan', secret, { method: 'POST', payload: { name: spec.name, amount: spec.amount, interval: spec.interval, currency: 'GHS' } }))?.plan_code;
        if (code && !(process.env[spec.env] || '').trim()) {
          process.env[spec.env] = code;
          discovered.add(spec.env);
        }
      }
    } catch (err) {
      console.error('[config] could not set up Paystack plans', err.message);
      planRetryAt = Date.now() + 5 * 60000; // try again in 5 minutes, never block payments
    } finally {
      planLookup = null;
    }
  })();
  return planLookup;
}
