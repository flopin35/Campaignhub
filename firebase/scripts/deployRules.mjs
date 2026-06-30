/**
 * Deploy Firestore rules to new1-e94db via Firebase Rules API.
 * Usage: node scripts/deployRules.mjs
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { configstore } = require('firebase-tools/lib/configstore');
const { getAccessToken } = require('firebase-tools/lib/auth');
const scopes = require('firebase-tools/lib/scopes');

const PROJECT_ID = 'new1-e94db';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

async function getToken() {
  const tokens = configstore.get('tokens');
  if (!tokens?.refresh_token) throw new Error('Run: npx firebase login --reauth');
  const tokenData = await getAccessToken(tokens.refresh_token, [
    scopes.OPENID,
    scopes.EMAIL,
    scopes.CLOUD_PLATFORM,
    scopes.FIREBASE_PLATFORM,
    'https://www.googleapis.com/auth/firebase',
    'https://www.googleapis.com/auth/cloud-platform',
  ]);
  return tokenData.access_token;
}

async function deployRuleset(accessToken, fileName, releaseName, label) {
  const rules = readFileSync(join(root, fileName), 'utf8');
  const createRes = await fetch(`https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: {
        files: [{ name: fileName, content: rules }],
      },
    }),
  });
  const created = await createRes.json();
  if (!createRes.ok) throw new Error(`${label} ruleset create failed: ${JSON.stringify(created)}`);

  const releaseRes = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases/${releaseName}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        release: {
          name: `projects/${PROJECT_ID}/releases/${releaseName}`,
          rulesetName: created.name,
        },
      }),
    }
  );
  const released = await releaseRes.json();
  if (!releaseRes.ok) throw new Error(`${label} release failed: ${JSON.stringify(released)}`);
  console.log(`✓ ${label} rules deployed`);
}

async function main() {
  console.log(`Deploying rules to ${PROJECT_ID}...\n`);
  const accessToken = await getToken();
  await deployRuleset(accessToken, 'firestore.rules', 'cloud.firestore', 'Firestore');
  await deployRuleset(
    accessToken,
    'storage.rules',
    `firebase.storage/${PROJECT_ID}.firebasestorage.app`,
    'Storage'
  );
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
