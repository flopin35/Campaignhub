#!/usr/bin/env node
/**
 * CampaignHub Pro — one command to go live.
 *
 *   cd frontend
 *   node scripts/go-live.mjs
 *
 * It asks for your keys (typing is hidden, nothing is saved to any file), then:
 *   1. builds the app (stops if the build fails)
 *   2. publishes the new Firestore + Storage security rules
 *   3. runs the one-time data clean-up (upgrade-firestore-data.mjs --apply)
 *   4. creates the Paystack Pro plans (₵120 monthly, ₵1,200 yearly) for card auto-renew
 *   5. stores every setting in Vercel (production) — PAYSTACK_SECRET_KEY, APP_URL, plan codes, Meta…
 *   6. deploys the site to production and runs the live smoke test
 *
 * Needs: you are logged in to the Vercel CLI (npx vercel login) and the Firebase CLI (npx firebase login)
 * on this computer — the same as for your earlier setup scripts.
 */
import { execSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { randomBytes } from 'crypto';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const frontend = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
const repo = resolve(frontend, '..');
const firebaseDir = join(repo, 'firebase');
const APP_URL = 'https://www.campaignhubgh.com';
const PROJECT = 'new1-e94db';

const ok = (m) => console.log(`\x1b[32m✓\x1b[0m ${m}`);
const warn = (m) => console.log(`\x1b[33m!\x1b[0m ${m}`);
const fail = (m) => {
  console.error(`\x1b[31m✗ ${m}\x1b[0m`);
  process.exit(1);
};
const step = (n, m) => console.log(`\n\x1b[1m${n}. ${m}\x1b[0m`);

function run(cmd, cwd, { input, quiet = false } = {}) {
  return execSync(cmd, {
    cwd,
    input,
    shell: true,
    stdio: input !== undefined ? ['pipe', quiet ? 'pipe' : 'inherit', 'pipe'] : quiet ? 'pipe' : 'inherit',
    env: process.env,
  });
}

function ask(question, { hidden = false } = {}) {
  return new Promise((res) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => {
        if (s.includes(question)) rl.output.write(s);
        else rl.output.write('*');
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      res(String(answer || '').trim());
    });
  });
}

async function paystack(path, secret, { method = 'GET', body } = {}) {
  const r = await fetch(`https://api.paystack.co${path}`, {
    method,
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.status) throw new Error(data.message || `Paystack ${r.status}`);
  return data.data;
}

async function ensurePlan(secret, { name, amount, interval }) {
  const plans = await paystack('/plan?perPage=100', secret);
  const found = (plans || []).find((p) => Number(p.amount) === amount && p.interval === interval && String(p.currency).toUpperCase() === 'GHS' && !p.is_deleted && !p.is_archived);
  if (found) return found.plan_code;
  const created = await paystack('/plan', secret, { method: 'POST', body: { name, amount, interval, currency: 'GHS' } });
  return created.plan_code;
}

function setVercelEnv(name, value) {
  try {
    run(`npx vercel env rm ${name} production --yes`, frontend, { quiet: true });
  } catch {
    /* not set yet */
  }
  run(`npx vercel env add ${name} production`, frontend, { input: `${value}\n`, quiet: true });
}

console.log('\n\x1b[1mCampaignHub Pro — go live\x1b[0m');
console.log('Your keys are only sent to Vercel / Paystack. They are not written to any file.\n');

if (!existsSync(join(frontend, '.vercel')) && !existsSync(join(repo, '.vercel'))) {
  warn('This folder is not linked to Vercel yet — run "npx vercel link" in the frontend folder first.');
}

// ---------------------------------------------------------------- keys
const paystackSecret = await ask('Paystack LIVE secret key (sk_live_…, use your NEW key): ', { hidden: true });
if (!/^sk_(live|test)_[A-Za-z0-9]+$/.test(paystackSecret)) fail('That does not look like a Paystack secret key (sk_live_…).');
try {
  await paystack('/balance', paystackSecret);
  ok('Paystack key works');
} catch (err) {
  fail(`Paystack rejected the key: ${err.message}`);
}
const flwSecret = await ask('Flutterwave secret key (FLWSECK-…) — press Enter to skip: ', { hidden: true });
const metaAppId = await ask('Meta App ID for Facebook ads — press Enter to skip: ');
const metaSecret = metaAppId ? await ask('Meta App Secret: ', { hidden: true }) : '';
const aiKey = await ask('OpenAI key (sk-…) or Gemini key (AIza…) for AI Studio — Enter to keep the current one: ', { hidden: true });

// ---------------------------------------------------------------- 1. build
step(1, 'Building the app');
try {
  run('npm install --no-audit --no-fund', frontend);
  run('npm run build', frontend);
  ok('Build succeeded');
} catch {
  fail('The build failed — copy the error above and send it to Claude. Nothing was published.');
}

// ---------------------------------------------------------------- 2. rules
step(2, 'Publishing security rules');
try {
  run(`npx firebase deploy --only firestore:rules,storage --project ${PROJECT}`, firebaseDir);
  ok('Firestore and Storage rules are live');
} catch {
  try {
    run('node scripts/deployRules.mjs', firebaseDir);
    ok('Rules published with deployRules.mjs');
  } catch {
    fail('Could not publish the rules (run "npx firebase login" in the firebase folder, then try again). Nothing else was changed.');
  }
}

// ---------------------------------------------------------------- 3. data
step(3, 'Cleaning up old data');
const keyFile = readdirSync(repo).find((f) => /firebase-adminsdk.*\.json$/.test(f));
if (!keyFile) {
  warn('No Firebase service-account key (…firebase-adminsdk….json) found next to the frontend folder — skipped. Run upgrade-firestore-data.mjs later.');
} else {
  try {
    run(`node scripts/upgrade-firestore-data.mjs --key "${join(repo, keyFile)}" --apply`, frontend);
    ok('Data clean-up done (report saved as upgrade-report-<date>.json)');
  } catch {
    warn('The data clean-up hit a problem — the site can still go live. Send the error above to Claude.');
  }
}

// ---------------------------------------------------------------- 4. Paystack plans
step(4, 'Creating Paystack plans for card auto-renew');
let planMonthly = '';
let planYearly = '';
try {
  planMonthly = await ensurePlan(paystackSecret, { name: 'CampaignHub Pro — Monthly', amount: 12000, interval: 'monthly' });
  planYearly = await ensurePlan(paystackSecret, { name: 'CampaignHub Pro — Yearly', amount: 120000, interval: 'annually' });
  ok(`Plans ready: ${planMonthly} (₵120/month), ${planYearly} (₵1,200/year)`);
} catch (err) {
  warn(`Could not create plans (${err.message}) — payments still work, only card auto-renew is off.`);
}

// ---------------------------------------------------------------- 5. Vercel settings
step(5, 'Saving settings in Vercel (production)');
const vars = { APP_URL, PAYSTACK_SECRET_KEY: paystackSecret };
if (planMonthly) vars.PAYSTACK_PLAN_MONTHLY = planMonthly;
if (planYearly) vars.PAYSTACK_PLAN_YEARLY = planYearly;
let flwHash = '';
if (flwSecret) {
  flwHash = randomBytes(24).toString('hex');
  vars.FLW_SECRET_KEY = flwSecret;
  vars.FLW_WEBHOOK_HASH = flwHash;
}
if (metaAppId && metaSecret) {
  vars.META_APP_ID = metaAppId;
  vars.META_APP_SECRET = metaSecret;
  vars.META_TOKEN_KEY = randomBytes(32).toString('hex');
}
if (aiKey) {
  if (aiKey.startsWith('AIza')) vars.GEMINI_API_KEY = aiKey;
  else vars.OPENAI_API_KEY = aiKey;
}
for (const [name, value] of Object.entries(vars)) {
  try {
    setVercelEnv(name, value);
    ok(name);
  } catch (err) {
    fail(`Could not save ${name} in Vercel (${String(err.stderr || err.message).split('\n')[0]}). Run "npx vercel login" and try again.`);
  }
}

// ---------------------------------------------------------------- 6. deploy
step(6, 'Deploying the site');
try {
  run('npx vercel --prod --yes', frontend);
  ok('Site deployed');
} catch {
  fail('Vercel could not deploy — send the error above to Claude.');
}
try {
  run('node scripts/smoke-test-production.mjs', frontend, {});
} catch {
  warn('Some live checks failed — see above.');
}

// ---------------------------------------------------------------- the only dashboard clicks left
console.log('\n\x1b[1mAlmost done — these can only be set in the providers’ dashboards:\x1b[0m');
console.log(`  • Paystack → Settings → API Keys & Webhooks → Live Webhook URL:\n      ${APP_URL}/api/webhooks/paystack`);
if (flwSecret) {
  console.log(`  • Flutterwave → Settings → Webhooks → URL: ${APP_URL}/api/webhooks/flutterwave`);
  console.log(`      Secret hash: ${flwHash}`);
}
if (metaAppId) {
  console.log('  • Meta app → Facebook Login for Business → Valid OAuth Redirect URIs:');
  console.log(`      ${APP_URL}/api/meta/callback   (and the URLs in docs/META_SETUP.md)`);
}
console.log('\nCampaignHub Pro is live.\n');
