/**
 * Add Vercel domains to Firebase Auth authorized domains.
 * Usage: node scripts/addAuthorizedDomains.mjs [extra-domain...]
 */
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { configstore } = require('firebase-tools/lib/configstore');
const { getAccessToken } = require('firebase-tools/lib/auth');
const scopes = require('firebase-tools/lib/scopes');

const PROJECT_ID = 'campaign-hub-b33c6';

const DEFAULT_DOMAINS = [
  'www.campaignhubgh.com',
  'campaignhubgh.com',
  'campaignhub-git-main-flopin35s-projects.vercel.app',
  'campaignhub-three.vercel.app',
  'frontend-sage-delta-25.vercel.app',
  'localhost',
];

async function main() {
  const tokens = configstore.get('tokens');
  if (!tokens?.refresh_token) {
    console.error('Not logged in. Run: npx firebase login');
    process.exit(1);
  }

  const authScopes = [
    scopes.OPENID,
    scopes.EMAIL,
    scopes.CLOUD_PLATFORM,
    scopes.FIREBASE_PLATFORM,
  ];

  const tokenData = await getAccessToken(tokens.refresh_token, authScopes);
  const accessToken = tokenData.access_token;
  const extra = process.argv.slice(2);
  const toAdd = [...new Set([...DEFAULT_DOMAINS, ...extra])];

  const getRes = await fetch(
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const config = await getRes.json();
  if (!getRes.ok) {
    console.error('Failed to read config:', config);
    process.exit(1);
  }

  const domains = [...(config.authorizedDomains || [])];
  let added = 0;
  for (const d of toAdd) {
    if (!domains.includes(d)) {
      domains.push(d);
      added++;
      console.log('+', d);
    }
  }

  if (added === 0) {
    console.log('All domains already authorized.');
    return;
  }

  const patchRes = await fetch(
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config?updateMask=authorizedDomains`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ authorizedDomains: domains }),
    }
  );
  const result = await patchRes.json();
  if (!patchRes.ok) {
    console.error('Failed to update:', result);
    process.exit(1);
  }

  console.log('\nAuthorized domains updated.');
  result.authorizedDomains.forEach((d) => console.log(' •', d));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
