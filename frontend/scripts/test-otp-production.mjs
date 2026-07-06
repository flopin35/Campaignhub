/**
 * Production OTP smoke test — send + verify rejection.
 * Usage: node scripts/test-otp-production.mjs [email]
 */
const BASE = process.env.OTP_TEST_BASE || 'https://www.campaignhubgh.com';
const email = process.argv[2] || 'otp-smoke-test@example.com';

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

let failed = false;

const send = await post('/api/auth/otp-send', { email });
console.log('otp-send:', send.status, send.data);

if (send.status !== 200 || !send.data?.success) {
  console.error('FAIL: otp-send');
  failed = true;
} else if (!['smtp', 'resend', 'dev'].includes(send.data.delivery)) {
  console.error('FAIL: unexpected delivery channel', send.data.delivery);
  failed = true;
} else {
  console.log('PASS: otp-send (delivery:', send.data.delivery + ')');
}

const verify = await post('/api/auth/otp-verify', { email, code: '000000' });
console.log('otp-verify (bad code):', verify.status, verify.data);

if (verify.status !== 400 || !verify.data?.message?.toLowerCase().includes('invalid')) {
  console.error('FAIL: otp-verify should reject wrong code with 400');
  failed = true;
} else {
  console.log('PASS: otp-verify rejects invalid code');
}

process.exit(failed ? 1 : 0);
