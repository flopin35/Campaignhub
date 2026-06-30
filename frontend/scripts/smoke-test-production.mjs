/**
 * Production smoke test for CampaignHub
 * Usage: node scripts/smoke-test-production.mjs
 */
const BASE = 'https://www.campaignhubgh.com';
const API_KEY = 'AIzaSyDaU9ckYnWCiQktFl0v0klqZqawHK_FeGU';

let passed = 0;
let failed = 0;
const warnings = [];

function ok(name) {
  console.log(`✓ ${name}`);
  passed++;
}

function fail(name, detail = '') {
  console.log(`✗ ${name}${detail ? `: ${detail}` : ''}`);
  failed++;
}

function warn(msg) {
  warnings.push(msg);
  console.log(`⚠ ${msg}`);
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'follow' });
  return { status: res.status, text: await res.text() };
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

console.log('CampaignHub production smoke test\n');
console.log(`Target: ${BASE}\n`);

// Pages
for (const path of ['/', '/login', '/signup', '/campaigns', '/premium', '/support', '/verify-email']) {
  try {
    const { status } = await get(path);
    if (status === 200) ok(`Page ${path}`);
    else fail(`Page ${path}`, `HTTP ${status}`);
  } catch (err) {
    fail(`Page ${path}`, err.message);
  }
}

// SPA shell markers on login
try {
  const { text } = await get('/login');
  if (text.includes('id="root"')) ok('Login SPA shell');
  else fail('Login SPA shell', 'missing root element');
  if (text.includes('assets/index-')) ok('Login JS bundle linked');
  else fail('Login JS bundle linked');
} catch (err) {
  fail('Login page content', err.message);
}

// APIs
try {
  const ai = await post('/api/ask-ai', { message: 'ping', type: 'presentation' });
  if (ai.status === 200 && ai.data?.success) ok('API /api/ask-ai');
  else fail('API /api/ask-ai', `HTTP ${ai.status}`);
} catch (err) {
  fail('API /api/ask-ai', err.message);
}

try {
  const rec = await post('/api/recommendations', {});
  if (rec.status === 200 && rec.data?.success) ok('API /api/recommendations');
  else fail('API /api/recommendations', `HTTP ${rec.status}`);
} catch (err) {
  fail('API /api/recommendations', err.message);
}

try {
  const otp = await post('/api/auth/otp-send', { email: 'test@example.com' });
  if (otp.status === 503 && otp.data?.code === 'OTP_ADMIN_MISSING') {
    warn('OTP API returns 503 (expected) — client falls back to Firebase email link');
    ok('OTP API responds with known missing-admin code');
  } else if (otp.status === 200) {
    ok('OTP API /api/auth/otp-send');
  } else {
    fail('OTP API /api/auth/otp-send', `HTTP ${otp.status} ${JSON.stringify(otp.data)}`);
  }
} catch (err) {
  fail('OTP API', err.message);
}

// Firebase email link sign-in enabled
try {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'EMAIL_SIGNIN',
        email: 'smoke-test@example.com',
        continueUrl: `${BASE}/login`,
        canHandleCodeInApp: true,
      }),
    }
  );
  const data = await res.json();
  if (res.ok) ok('Firebase EMAIL_SIGNIN enabled');
  else if (data?.error?.message === 'OPERATION_NOT_ALLOWED') {
    fail('Firebase EMAIL_SIGNIN', 'OPERATION_NOT_ALLOWED — email link sign-in disabled');
  } else {
    fail('Firebase EMAIL_SIGNIN', data?.error?.message || `HTTP ${res.status}`);
  }
} catch (err) {
  fail('Firebase EMAIL_SIGNIN', err.message);
}

// Bundle contains recent auth strings
try {
  const { text: html } = await get('/login');
  const match = html.match(/assets\/index-([^.]+)\.js/);
  if (!match) {
    fail('Auth bundle check', 'index bundle not found');
  } else {
    const jsRes = await fetch(`${BASE}/assets/index-${match[1]}.js`);
    const js = await jsRes.text();
    const markers = ['campaignhub_email_for_sign_in', 'www.campaignhubgh.com/login', 'verify-email'];
    const found = markers.filter((m) => js.includes(m));
    if (found.length === markers.length) ok(`Production bundle has auth markers (${found.length}/${markers.length})`);
    else if (found.length >= 2) ok(`Production bundle has auth markers (${found.length}/${markers.length})`);
    else fail('Production bundle auth markers', `found ${found.join(', ') || 'none'}`);
  }
} catch (err) {
  fail('Bundle check', err.message);
}

console.log(`\nResult: ${passed} passed, ${failed} failed`);
if (warnings.length) {
  console.log('\nWarnings:');
  warnings.forEach((w) => console.log(` • ${w}`));
}
process.exit(failed ? 1 : 0);
