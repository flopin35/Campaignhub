/**
 * /api/admin/:action — Admin → Setup (admin only). Lets the site owner finish setup from the browser:
 *   POST status          → which keys are set (never the values), setup progress, webhook URLs
 *   POST save-settings   → store keys in Firestore config/secrets (server-only; never in code or git)
 *   POST deploy-rules    → publish the bundled Firestore + Storage security rules (Firebase Admin)
 *   POST run-upgrade     → one-time data check / clean-up ({ apply, strip })
 *   POST create-plans    → create the ₵120 monthly / ₵1,200 yearly Paystack plans for card auto-renew
 */
import { getApps } from 'firebase-admin/app';
import {
  HttpError,
  applyCors,
  sendJson,
  getAppOrigin,
  requireAdminSdk,
  requireUser,
} from '../_lib/billing.js';
import { loadRuntimeConfig, settingSource, RUNTIME_KEYS } from '../_lib/runtimeConfig.js';
import { FIRESTORE_RULES, STORAGE_RULES } from '../_lib/rulesSource.js';
import { runUpgrade } from '../_lib/upgradeData.js';

const FORMATS = {
  APP_URL: /^https:\/\/[^\s/]+$/,
  PAYSTACK_SECRET_KEY: /^sk_(live|test)_[A-Za-z0-9]+$/,
  PAYSTACK_PLAN_MONTHLY: /^PLN_[A-Za-z0-9]+$/,
  PAYSTACK_PLAN_YEARLY: /^PLN_[A-Za-z0-9]+$/,
  FLW_SECRET_KEY: /^FLWSECK(_TEST)?-[A-Za-z0-9-]+$/,
  FLW_WEBHOOK_HASH: /^[A-Za-z0-9_-]{16,128}$/,
  META_APP_ID: /^\d{5,25}$/,
  META_APP_SECRET: /^[a-f0-9]{32}$/i,
  META_TOKEN_KEY: /^.{24,200}$/,
  META_LOGIN_CONFIG_ID: /^\d{5,25}$/,
  OPENAI_API_KEY: /^sk-[A-Za-z0-9_-]{20,}$/,
  GEMINI_API_KEY: /^AIza[A-Za-z0-9_-]{20,}$/,
};

function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try {
    return JSON.parse(req.body || '{}');
  } catch {
    return {};
  }
}

const mask = (v) => (v ? `••••${String(v).slice(-4)}` : '');

async function paystack(path, secret, { method = 'GET', payload } = {}) {
  const r = await fetch(`https://api.paystack.co${path}`, {
    method,
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: payload ? JSON.stringify(payload) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.status) throw new HttpError(502, `Paystack said: ${data.message || r.status}`);
  return data.data;
}

async function ensurePlan(secret, { name, amount, interval }) {
  const plans = await paystack('/plan?perPage=100', secret);
  const found = (plans || []).find((p) => Number(p.amount) === amount && p.interval === interval
    && String(p.currency).toUpperCase() === 'GHS' && !p.is_deleted && !p.is_archived);
  if (found) return found.plan_code;
  return (await paystack('/plan', secret, { method: 'POST', payload: { name, amount, interval, currency: 'GHS' } })).plan_code;
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const action = req.query?.action || (req.url || '').split('?')[0].split('/').filter(Boolean).pop();

  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
    const admin = await requireAdminSdk();
    const user = await requireUser(req, admin);
    if (!user.isAdmin) throw new HttpError(403, 'Admins only.');
    await loadRuntimeConfig({ force: true });
    const secretsRef = admin.db.collection('config').doc('secrets');
    const setupRef = admin.db.collection('config').doc('setup');
    const input = body(req);

    if (action === 'status') {
      const setup = (await setupRef.get()).data() || {};
      const origin = getAppOrigin(req);
      const settings = Object.fromEntries(RUNTIME_KEYS.map((k) => [k, {
        set: !!process.env[k],
        source: settingSource(k),
        // FLW_WEBHOOK_HASH is shown in full: the admin has to paste it into Flutterwave.
        hint: ['APP_URL', 'META_APP_ID', 'FLW_WEBHOOK_HASH'].includes(k) || k.startsWith('PAYSTACK_PLAN') ? process.env[k] || '' : mask(process.env[k]),
      }]));
      return sendJson(res, 200, {
        success: true,
        data: {
          settings,
          adminSdk: true,
          setup: {
            rulesDeployedAt: setup.rulesDeployedAt?.toMillis?.() || null,
            upgradeAppliedAt: setup.upgradeAppliedAt?.toMillis?.() || null,
            plansCreatedAt: setup.plansCreatedAt?.toMillis?.() || null,
          },
          urls: {
            paystackWebhook: `${origin}/api/webhooks/paystack`,
            flutterwaveWebhook: `${origin}/api/webhooks/flutterwave`,
            metaRedirect: `${origin}/api/meta/callback`,
            metaDeauthorize: `${origin}/api/meta/deauthorize`,
            metaDataDeletion: `${origin}/api/meta/data-deletion`,
          },
        },
      });
    }

    if (action === 'save-settings') {
      const values = input.values && typeof input.values === 'object' ? input.values : {};
      const update = {};
      const errors = [];
      Object.entries(values).forEach(([k, raw]) => {
        if (!RUNTIME_KEYS.includes(k)) return;
        const v = String(raw ?? '').trim();
        if (!v) return;
        if (FORMATS[k] && !FORMATS[k].test(v)) errors.push(k);
        else update[k] = v;
      });
      (Array.isArray(input.clear) ? input.clear : []).forEach((k) => {
        if (RUNTIME_KEYS.includes(k)) update[k] = null;
      });
      if (errors.length) throw new HttpError(400, `These don’t look right: ${errors.join(', ')}`);
      if (update.PAYSTACK_SECRET_KEY) await paystack('/balance', update.PAYSTACK_SECRET_KEY); // proves the key works
      if ((update.FLW_SECRET_KEY || process.env.FLW_SECRET_KEY) && !update.FLW_WEBHOOK_HASH && !process.env.FLW_WEBHOOK_HASH) {
        update.FLW_WEBHOOK_HASH = (await import('crypto')).randomBytes(24).toString('hex');
      }
      if ((update.META_APP_ID || update.META_APP_SECRET) && !process.env.META_TOKEN_KEY && !update.META_TOKEN_KEY) {
        update.META_TOKEN_KEY = (await import('crypto')).randomBytes(32).toString('hex');
      }
      await secretsRef.set({ ...update, updatedAt: new Date(), updatedBy: user.email }, { merge: true });
      await loadRuntimeConfig({ force: true });
      return sendJson(res, 200, { success: true, data: { saved: Object.keys(update) } });
    }

    if (action === 'deploy-rules') {
      const { getSecurityRules } = await import('firebase-admin/security-rules');
      const app = getApps()[0];
      const projectId = app?.options?.credential?.projectId || process.env.FIREBASE_PROJECT_ID || 'new1-e94db';
      const bucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`;
      const rules = getSecurityRules(app);
      try {
        await rules.releaseFirestoreRulesetFromSource(FIRESTORE_RULES);
        await rules.releaseStorageRulesetFromSource(STORAGE_RULES, bucket);
      } catch (err) {
        throw new HttpError(502, `Firebase refused the rules: ${String(err.message || err).slice(0, 300)}`);
      }
      await setupRef.set({ rulesDeployedAt: new Date() }, { merge: true });
      return sendJson(res, 200, { success: true, data: { deployed: true, bucket } });
    }

    if (action === 'run-upgrade') {
      const report = await runUpgrade(admin.db, { apply: !!input.apply, strip: !!input.strip });
      if (input.apply) await setupRef.set({ upgradeAppliedAt: new Date(), lastUpgradeReport: JSON.stringify(report).slice(0, 900000) }, { merge: true });
      return sendJson(res, 200, { success: true, data: report });
    }

    if (action === 'create-plans') {
      const secret = process.env.PAYSTACK_SECRET_KEY;
      if (!secret) throw new HttpError(400, 'Save your Paystack secret key first.');
      const monthly = await ensurePlan(secret, { name: 'CampaignHub Pro — Monthly', amount: 12000, interval: 'monthly' });
      const yearly = await ensurePlan(secret, { name: 'CampaignHub Pro — Yearly', amount: 120000, interval: 'annually' });
      await secretsRef.set({ PAYSTACK_PLAN_MONTHLY: monthly, PAYSTACK_PLAN_YEARLY: yearly, updatedAt: new Date() }, { merge: true });
      await setupRef.set({ plansCreatedAt: new Date() }, { merge: true });
      await loadRuntimeConfig({ force: true });
      return sendJson(res, 200, { success: true, data: { monthly, yearly } });
    }

    throw new HttpError(404, 'Unknown action');
  } catch (err) {
    const known = err instanceof HttpError;
    const status = known ? err.status : 500;
    if (status >= 500) console.error('[admin]', action, err);
    return sendJson(res, status, { success: false, message: known ? err.message : `Setup error: ${String(err.message || err).slice(0, 200)}` });
  }
}
