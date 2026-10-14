/**
 * Keeps the live Firebase security rules in step with the code — no CLI or console needed.
 *
 * The rules in firebase/firestore.rules + storage.rules are bundled into rulesSource.js
 * (npm run sync-rules). The first API call after a deploy compares their fingerprint with
 * config/setup.rulesHash and, if they differ, publishes them with Firebase Admin. Then it runs
 * the one-time data clean-up once (never removes anything; "Remove unpaid Pro" stays manual).
 * Without this, new tools (Ads, Election Day, Messages, Field Team…) fail with
 * "Missing or insufficient permissions" because the old rules don't know their collections.
 */
import { createHash } from 'crypto';
import { FIRESTORE_RULES, STORAGE_RULES } from './rulesSource.js';
import { runUpgrade } from './upgradeData.js';

export const RULES_HASH = createHash('sha256')
  .update(FIRESTORE_RULES)
  .update('\n--storage--\n')
  .update(STORAGE_RULES)
  .digest('hex')
  .slice(0, 16);

const ms = (t) => (t?.toMillis ? t.toMillis() : t instanceof Date ? t.getTime() : Number(t) || 0);

/** Publish the bundled Firestore + Storage rules. Returns the storage bucket used. */
export async function publishRules() {
  const { getApps } = await import('firebase-admin/app');
  const { getSecurityRules } = await import('firebase-admin/security-rules');
  const app = getApps()[0];
  const projectId = app?.options?.credential?.projectId || app?.options?.projectId || process.env.FIREBASE_PROJECT_ID || 'new1-e94db';
  const bucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`;
  const rules = getSecurityRules(app);
  await rules.releaseFirestoreRulesetFromSource(FIRESTORE_RULES);
  await rules.releaseStorageRulesetFromSource(STORAGE_RULES, bucket);
  return bucket;
}

let done = false;
let retryAt = 0;
let running = null;
let lastError = '';
let rulesLive = false;

/** Safe, non-secret status for the public health readout. */
export function autoSetupState() {
  return { rules: rulesLive ? 'published' : lastError ? 'error' : 'pending', rulesError: rulesLive ? '' : lastError.slice(0, 160) };
}

export async function ensureAutoSetup(admin) {
  if (done || !admin || Date.now() < retryAt) return;
  if (running) return running;
  running = (async () => {
    const ref = admin.db.collection('config').doc('setup');
    try {
      let setup = (await ref.get()).data() || {};

      if (setup.rulesHash !== RULES_HASH) {
        // Another server instance is publishing right now — let it finish.
        if (Date.now() - ms(setup.rulesPublishingAt) < 90000) {
          retryAt = Date.now() + 20000;
          return;
        }
        await ref.set({ rulesPublishingAt: new Date() }, { merge: true });
        const bucket = await publishRules();
        await ref.set({ rulesHash: RULES_HASH, rulesDeployedAt: new Date(), rulesBucket: bucket, rulesPublishingAt: null }, { merge: true });
        console.log('[setup] security rules published', RULES_HASH);
        setup = { ...setup, rulesHash: RULES_HASH };
      }
      lastError = '';
      rulesLive = true;

      if (!setup.upgradeAppliedAt && Date.now() - ms(setup.upgradeStartedAt) > 5 * 60000) {
        await ref.set({ upgradeStartedAt: new Date() }, { merge: true });
        try {
          const report = await runUpgrade(admin.db, { apply: true });
          await ref.set({ upgradeAppliedAt: new Date(), lastUpgradeReport: JSON.stringify(report).slice(0, 900000) }, { merge: true });
          console.log('[setup] one-time data clean-up done');
        } catch (err) {
          console.error('[setup] data clean-up failed (will retry)', err.message);
          retryAt = Date.now() + 10 * 60000;
          return;
        }
      }
      done = true;
    } catch (err) {
      lastError = String(err.message || err);
      console.error('[setup] could not publish security rules (will retry in 10 min)', lastError.slice(0, 300));
      await ref.set({ rulesPublishingAt: null, rulesError: String(err.message || err).slice(0, 500), rulesErrorAt: new Date() }, { merge: true }).catch(() => {});
      retryAt = Date.now() + 10 * 60000;
    } finally {
      running = null;
    }
  })();
  return running;
}
