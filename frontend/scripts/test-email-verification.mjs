/**
 * Email verification + login gate tests
 */
import {
  hasEmailVerificationLink,
  parseEmailActionFromUrl,
  resolvePostLoginPath,
  getVerificationContinueUrl,
} from '../src/utils/authVerification.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`✗ ${name}: ${err.message}`);
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'failed');
}

test('detects verifyEmail link in URL', () => {
  assert(hasEmailVerificationLink('?mode=verifyEmail&oobCode=abc123'));
  assert(!hasEmailVerificationLink('?mode=resetPassword&oobCode=x'));
});

test('parseEmailActionFromUrl', () => {
  const p = parseEmailActionFromUrl('?mode=verifyEmail&oobCode=xyz&apiKey=k');
  assert(p.mode === 'verifyEmail' && p.oobCode === 'xyz');
});

test('unverified user goes to verify-email after login', () => {
  assert(resolvePostLoginPath(false, '/dashboard') === '/verify-email');
});

test('verified user reaches intended path', () => {
  assert(resolvePostLoginPath(true, '/upload') === '/upload');
  assert(resolvePostLoginPath(true, '/dashboard') === '/dashboard');
});

test('verified user cannot be sent back to login', () => {
  assert(resolvePostLoginPath(true, '/login') === '/dashboard');
});

test('production continue URL', () => {
  global.window = { location: { origin: 'https://www.campaignhubgh.com' } };
  assert(getVerificationContinueUrl() === 'https://www.campaignhubgh.com/verify-email');
});

// isUserVerified logic mirror
function isUserVerified(user, profile) {
  if (!user) return false;
  const isGoogle = profile?.provider === 'google' || user.providerData?.some((p) => p.providerId === 'google.com');
  const isOtp = profile?.provider === 'otp' || user.providerData?.some((p) => p.providerId === 'custom');
  if (isGoogle || isOtp) return true;
  return user.emailVerified === true;
}

test('Google user verified without emailVerified flag', () => {
  assert(isUserVerified({ emailVerified: false, providerData: [{ providerId: 'google.com' }] }, { provider: 'google' }));
});

test('password user needs emailVerified', () => {
  assert(!isUserVerified({ emailVerified: false, providerData: [{ providerId: 'password' }] }, { provider: 'email' }));
  assert(isUserVerified({ emailVerified: true, providerData: [{ providerId: 'password' }] }, { provider: 'email' }));
});

console.log(`\nVerification tests: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
