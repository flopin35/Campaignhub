/**
 * Fix Firebase email auth: enable email link sign-in and authorized domains.
 * Resolves "The selected page mode is invalid" when mode=signIn was blocked.
 *
 * Usage: node scripts/fixEmailAuth.mjs
 */
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { configstore } = require('firebase-tools/lib/configstore');
const { getAccessToken } = require('firebase-tools/lib/auth');
const scopes = require('firebase-tools/lib/scopes');

const PROJECT_ID = 'campaign-hub-b33c6';

const DOMAINS = [
  'localhost',
  'campaignhubgh.com',
  'www.campaignhubgh.com',
  'campaign-hub-b33c6.firebaseapp.com',
  'campaignhub-three.vercel.app',
  'frontend-sage-delta-25.vercel.app',
];

async function getToken() {
  const tokens = configstore.get('tokens');
  if (!tokens?.refresh_token) {
    throw new Error('Not logged in. Run: npx firebase login');
  }
  const tokenData = await getAccessToken(tokens.refresh_token, [
    scopes.OPENID,
    scopes.EMAIL,
    scopes.CLOUD_PLATFORM,
    scopes.FIREBASE_PLATFORM,
  ]);
  return tokenData.access_token;
}

async function api(accessToken, path, options = {}) {
  const res = await fetch(`https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error?.message || `HTTP ${res.status}`);
    err.body = body;
    throw err;
  }
  return body;
}

async function main() {
  const accessToken = await getToken();
  console.log('Updating Firebase Auth config…\n');

  const config = await api(accessToken, '/config');
  const domains = [...new Set([...(config.authorizedDomains || []), ...DOMAINS])];

  const updated = await api(accessToken, '/config?updateMask=authorizedDomains,signIn.email', {
    method: 'PATCH',
    body: JSON.stringify({
      authorizedDomains: domains,
      signIn: {
        email: {
          enabled: true,
          passwordRequired: false,
        },
      },
    }),
  });

  console.log('✓ Email sign-in enabled:', updated.signIn?.email?.enabled);
  console.log('✓ Email link allowed (passwordRequired=false)');
  console.log('\nAuthorized domains:');
  (updated.authorizedDomains || []).forEach((d) => console.log(' •', d));

  const pendingDomain = updated.notification?.sendEmail?.dnsInfo?.pendingCustomDomain;
  if (pendingDomain) {
    console.log('\n⚠ Custom email domain pending:', pendingDomain);
    console.log('  If links still fail, fix typo in Firebase Console → Authentication → Templates → SMTP/custom domain');
  }

  console.log('\nDone. Email link sign-in should work now.');
}

main().catch((err) => {
  console.error(err.message || err);
  if (err.body) console.error(JSON.stringify(err.body, null, 2));
  process.exit(1);
});
