/**
 * Push VITE_FIREBASE_* env vars to Vercel for project new1-e94db.
 * Usage: node scripts/setup-firebase-vercel.mjs
 */
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const vars = {
  VITE_FIREBASE_API_KEY: 'AIzaSyDgq9q4FQf0Mv8_l5njSQKOmAFlpEEl2gk',
  VITE_FIREBASE_AUTH_DOMAIN: 'new1-e94db.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'new1-e94db',
  VITE_FIREBASE_STORAGE_BUCKET: 'new1-e94db.firebasestorage.app',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '888917258575',
  VITE_FIREBASE_APP_ID: '1:888917258575:web:2ead27d13446930f13553a',
  FIREBASE_PROJECT_ID: 'new1-e94db',
};

console.log('Setting Vercel production Firebase env vars for campaignhub...\n');

for (const [key, value] of Object.entries(vars)) {
  try {
    execSync(`npx vercel env add ${key} production --force`, {
      input: value,
      cwd: root,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });
    console.log(`✓ ${key}`);
  } catch (err) {
    console.error(`✗ ${key}:`, err.stderr?.toString() || err.message);
  }
}

console.log('\nDone. Redeploy: npx vercel --prod');
