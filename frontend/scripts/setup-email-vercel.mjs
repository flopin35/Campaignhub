/**
 * Configure Gmail SMTP for OTP emails on Vercel.
 *
 * Usage:
 *   node scripts/setup-email-vercel.mjs YOUR_GMAIL_APP_PASSWORD
 *
 * Gmail App Password (required):
 *   1. Sign in to campaignhubgh@gmail.com
 *   2. Google Account → Security → 2-Step Verification (must be on)
 *   3. App passwords → Mail → Generate
 *   4. Copy the 16-character password (no spaces)
 */
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const appPassword = process.argv[2]?.replace(/\s/g, '');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const SMTP_USER = 'campaignhubgh@gmail.com';

const vars = {
  SMTP_USER,
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  OTP_EMAIL_FROM: `CampaignHub <${SMTP_USER}>`,
};

if (appPassword) {
  vars.SMTP_PASS = appPassword;
}

console.log(`Setting Gmail SMTP on Vercel (${SMTP_USER})...\n`);

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

if (!appPassword) {
  console.error('\n⚠ SMTP_USER set, but SMTP_PASS is missing.');
  console.error('Gmail requires an App Password (not your normal Gmail password):');
  console.error('  Google Account → Security → 2-Step Verification → App passwords → Mail');
  console.error('\nThen run:');
  console.error('  node scripts/setup-email-vercel.mjs YOUR_16_CHAR_APP_PASSWORD');
  console.error('  npx vercel --prod');
  process.exit(1);
}

console.log('\nDone. Redeploy: npx vercel --prod');
