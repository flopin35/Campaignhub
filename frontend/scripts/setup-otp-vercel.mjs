/**
 * Push OTP + Firebase Admin env vars to Vercel from a service account JSON file.
 *
 * Usage:
 *   node scripts/setup-otp-vercel.mjs path/to/serviceAccount.json
 *   node scripts/setup-otp-vercel.mjs path/to/serviceAccount.json re_your_resend_key
 *
 * Get service account JSON:
 *   Firebase Console → Project Settings → Service accounts → Generate new private key
 */
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { randomBytes } from 'crypto';

const jsonPath = process.argv[2];
const resendKey = process.argv[3];

if (!jsonPath || !existsSync(jsonPath)) {
  console.error('Usage: node scripts/setup-otp-vercel.mjs <serviceAccount.json> [RESEND_API_KEY]');
  console.error('\nDownload from Firebase Console → Service accounts → Generate new private key');
  process.exit(1);
}

const sa = JSON.parse(readFileSync(jsonPath, 'utf8'));
const otpSecret = randomBytes(32).toString('hex');

const vars = {
  FIREBASE_PROJECT_ID: sa.project_id,
  FIREBASE_CLIENT_EMAIL: sa.client_email,
  FIREBASE_PRIVATE_KEY: sa.private_key,
  OTP_SECRET: otpSecret,
  OTP_EMAIL_FROM: 'CampaignHub <onboarding@resend.dev>',
};

if (resendKey) vars.RESEND_API_KEY = resendKey;

console.log('Setting Vercel production env vars for campaignhub...\n');

for (const [key, value] of Object.entries(vars)) {
  try {
    const input = typeof value === 'string' ? value : JSON.stringify(value);
    execSync(`npx vercel env add ${key} production --force`, {
      input,
      cwd: new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });
    console.log(`✓ ${key}`);
  } catch (err) {
    console.error(`✗ ${key}:`, err.stderr?.toString() || err.message);
  }
}

console.log('\nDone. Redeploy: npx vercel --prod');
console.log('Resend free tier: verify your domain or use onboarding@resend.dev for testing.');
