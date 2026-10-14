#!/usr/bin/env node
/**
 * CampaignHub Pro upgrade — one-time data check and clean-up.
 *
 * Run it right AFTER you deploy the new firestore.rules (and before you announce the new app).
 * It uses your Firebase service-account key, so it runs on your computer, never in the browser.
 *
 *   cd frontend
 *   node scripts/upgrade-firestore-data.mjs --key ../new1-e94db-firebase-adminsdk-XXXX.json
 *       → report only, changes nothing
 *   node scripts/upgrade-firestore-data.mjs --key ../new1-e94db-firebase-adminsdk-XXXX.json --apply
 *       → makes the safe fixes listed below
 *   node scripts/upgrade-firestore-data.mjs --key ../new1-e94db-firebase-adminsdk-XXXX.json --apply --strip-unbacked
 *       → ALSO removes Pro time / trials that no verified payment backs (read the report first!)
 *
 * Safe fixes (--apply):
 *   1. Pages an admin hid the old way (status 'active' + disabled) → status 'suspended' (owner cannot undo).
 *   2. Events with no isPublic flag → isPublic: true (the public page now asks only for public events).
 *   3. Campaigns with a createdAt in the future (back-dated to top the directory) → createdAt = now.
 *   4. Owner e-mail addresses removed from public campaign documents (privacy).
 *   5. Ids of deleted campaigns that still have voter/donation records → a tombstone in analytics/,
 *      so nobody can create a new campaign with that id and read the old records.
 *
 * Report only (fixed with --strip-unbacked):
 *   A. Legacy premium ('campaign-crm') still running with no verified MoMo payment on record.
 *   B. Free trials that are longer than 8 days or not registered on the owner's account.
 *   C. Pro subscriptions with no successful Paystack/Flutterwave payment and not granted by an admin.
 * Report only (review by hand):
 *   D. Verified / featured / Spotlight badges.   E. Duplicate page links (slugs).
 *   F. Old ₵500 bundle customers whose Pro time has ended.   G. Old payment proofs asking for > 400 days.
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const APPLY = flag('apply');
const STRIP = flag('strip-unbacked');
const keyPath = opt('key') || process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!keyPath) {
  console.error('Pass your service-account key: --key ../new1-e94db-firebase-adminsdk-XXXX.json');
  process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(resolve(keyPath), 'utf8'));
const { initializeApp, cert } = await import('firebase-admin/app');
const { getFirestore } = await import('firebase-admin/firestore');
const { runUpgrade } = await import('../api/_lib/upgradeData.js');
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

console.log(`\nCampaignHub upgrade check — ${APPLY ? 'APPLYING FIXES' : 'report only (nothing will change)'}${STRIP ? ' + stripping unbacked Pro' : ''}\n`);
const report = await runUpgrade(db, { apply: APPLY, strip: STRIP });
const c = report.counts;


const section = (title, rows) => {
  console.log(`\n${title} (${rows.length})`);
  if (!rows.length) console.log('  none');
  rows.slice(0, 200).forEach((r) => console.log(`  • ${typeof r === 'string' ? r : JSON.stringify(r)}`));
};

console.log(`Checked ${c.campaigns} campaigns, ${c.events} events, ${c.oldPaymentProofs} old payment proofs, ${c.onlinePayments} successful online payments.`);
section(APPLY ? 'Suspended (old-style admin hides)' : 'Would suspend (old-style admin hides)', report.fixes.suspended);
section(APPLY ? 'createdAt reset (was in the future)' : 'Would reset createdAt (in the future)', report.fixes.createdAtReset);
console.log(`\n${APPLY ? 'Events marked public' : 'Events to mark public'}: ${report.fixes.eventsMadePublic}`);
console.log(`${APPLY ? 'Owner e-mails removed from public pages' : 'Owner e-mails to remove from public pages'}: ${report.fixes.ownerEmailRemoved}`);
console.log(`${APPLY ? 'Deleted campaign ids locked (tombstones)' : 'Deleted campaign ids to lock (tombstones)'}: ${report.fixes.tombstones.length}`);
section(`A. Legacy Pro with no verified payment${STRIP ? ' — ENDED' : ''}`, report.unbackedLegacyPro);
section(`B. Suspicious free trials${STRIP ? ' — ENDED' : ''}`, report.suspiciousTrials);
section(`C. Pro subscriptions with no successful payment${STRIP ? ' — REMOVED' : ''}`, report.unbackedSubscriptions);
section('   Manual (admin) grants — check these are yours', report.manualSubscriptions);
section('D. Badges to review (verified / featured / Spotlight)', report.badges);
section('E. Duplicate page links', report.duplicateSlugs);
section('F. Old ₵500 bundle customers whose Pro has ended (grant Pro if you promised them more time)', report.endedOldBundles);
section('G. Old payment proofs asking for more than 400 days', report.suspiciousProofs);

const out = resolve(`upgrade-report-${new Date().toISOString().slice(0, 10)}.json`);
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(`\nFull report saved to ${out}\n${APPLY ? 'Done.' : 'Nothing was changed. Re-run with --apply to make the safe fixes.'}\n`);
process.exit(0);
