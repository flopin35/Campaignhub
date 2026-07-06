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
const arg3 = process.argv[3];
const arg4 = process.argv[4];

// Gmail app password as 3rd arg, or 4th when Resend key is skipped with "-"
const resendKey = arg3 && arg3 !== '-' && arg3.startsWith('re_') ? arg3 : null;
const gmailAppPassword = (arg4 && arg4 !== '-') ? arg4 : ((!arg3 || arg3 === '-') ? null : (!arg3.startsWith('re_') ? arg3.replace(/\s/g, '') : null));
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

if (!jsonPath || !existsSync(jsonPath)) {
  console.error('Usage: node scripts/setup-otp-vercel.mjs <serviceAccount.json> [RESEND_API_KEY|-] [GMAIL_APP_PASSWORD]');
  console.error('  Or:   node scripts/setup-otp-vercel.mjs <serviceAccount.json> GMAIL_APP_PASSWORD');
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
  OTP_EMAIL_FROM: 'CampaignHub <campaignhubgh@gmail.com>',
};

if (resendKey) vars.RESEND_API_KEY = resendKey;

if (gmailAppPassword) {
  vars.SMTP_USER = 'campaignhubgh@gmail.com';
  vars.SMTP_PASS = gmailAppPassword.replace(/\s/g, '');
  vars.GMAIL_APP_PASSWORD = gmailAppPassword.replace(/\s/g, '');
  vars.SMTP_HOST = 'smtp.gmail.com';
  vars.SMTP_PORT = '587';
  vars.OTP_EMAIL_FROM = 'CampaignHub <campaignhubgh@gmail.com>';
  console.log('Email: Gmail SMTP (campaignhubgh@gmail.com)');
} else if (resendKey) {
  console.log('Email: Resend API');
} else {
  console.log('Email: none — add Gmail app password as 3rd arg (recommended)');
}

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
if (!resendKey && !gmailAppPassword) {
  console.log('\n⚠ No email provider — 6-digit codes will not send until you add one:');
  console.log('  Gmail (recommended): node scripts/setup-otp-vercel.mjs <json> your_16_char_app_password');
  console.log('  Resend:              node scripts/setup-otp-vercel.mjs <json> re_your_key');
  console.log('  (Create Gmail App Password: Google Account → Security → 2-Step → App passwords)');
} else if (resendKey && !gmailAppPassword) {
  console.log('\nTip: Prefer Gmail SMTP for campaignhubgh@gmail.com — invalid Resend keys are ignored automatically.');
}
