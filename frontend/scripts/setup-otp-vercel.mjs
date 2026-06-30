/**
 * Push OTP + Firebase Admin env vars to Vercel from a service account JSON file.
 *
 * Usage:
 *   node scripts/setup-otp-vercel.mjs path/to/serviceAccount.json
 *   node scripts/setup-otp-vercel.mjs path/to/serviceAccount.json re_your_resend_key
 */
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { randomBytes } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const jsonPath = process.argv[2];
const resendKey = process.argv[3];
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

if (!jsonPath || !existsSync(jsonPath)) {
  console.error('Usage: node scripts/setup-otp-vercel.mjs <serviceAccount.json> [RESEND_API_KEY]');
  process.exit(1);
}

const sa = JSON.parse(readFileSync(jsonPath, 'utf8'));
const otpSecret = randomBytes(32).toString('hex');

const vars = {
  FIREBASE_PROJECT_ID: sa.project_id,
  FIREBASE_CLIENT_EMAIL: sa.client_email,
  FIREBASE_PRIVATE_KEY: sa.private_key,
  FIREBASE_SERVICE_ACCOUNT: JSON.stringify(sa),
  OTP_SECRET: otpSecret,
  OTP_EMAIL_FROM: 'CampaignHub <onboarding@resend.dev>',
};

if (resendKey) vars.RESEND_API_KEY = resendKey;

console.log('Setting Vercel production env vars for campaignhub...\n');

for (const [key, value] of Object.entries(vars)) {
  try {
    execSync(`npx vercel env add ${key} production --force`, {
      input: String(value),
      cwd: root,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    console.log(`✓ ${key}`);
  } catch (err) {
    console.error(`✗ ${key}:`, err.stderr?.toString() || err.message);
  }
}

console.log('\nDone. Redeploy: npx vercel --prod');
if (!resendKey) {
  console.log('\n⚠ No RESEND_API_KEY — add one for emails to send:');
  console.log('  node scripts/setup-otp-vercel.mjs <json> re_your_key');
}
