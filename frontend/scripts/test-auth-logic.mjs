/**
 * Real-user auth flow unit tests (logic only, no Firebase calls)
 */
import { isMobileDevice, shouldUseGoogleRedirect, sanitizeEmail, isUserVerified } from '../src/services/authService.js';
import { acquireAuthLock, releaseAuthLock } from '../src/utils/authSession.js';
import { saveAuthReturnPath, consumeAuthReturnPath } from '../src/utils/authRedirect.js';

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
  if (!cond) throw new Error(msg || 'Assertion failed');
}

// --- Mobile detection ---
test('desktop UA should not force redirect', () => {
  global.window = { innerWidth: 1280, ontouchstart: undefined };
  const orig = global.navigator;
  global.navigator = { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120' };
  assert(!shouldUseGoogleRedirect(), 'desktop should use popup');
  global.navigator = orig;
});

test('iPhone UA should use redirect', () => {
  global.window = { innerWidth: 390, ontouchstart: () => {} };
  const orig = global.navigator;
  global.navigator = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15' };
  assert(shouldUseGoogleRedirect(), 'mobile should redirect');
  global.navigator = orig;
});

// --- Email sanitize ---
test('sanitizeEmail trims and lowercases', () => {
  assert(sanitizeEmail('  Test@Gmail.COM  ') === 'test@gmail.com');
});

// --- Verified users ---
test('Google user is verified without emailVerified flag', () => {
  const user = {
    emailVerified: false,
    providerData: [{ providerId: 'google.com' }],
  };
  assert(isUserVerified(user, { provider: 'google' }));
});

test('OTP user is verified', () => {
  const user = { emailVerified: false, providerData: [{ providerId: 'custom' }] };
  assert(isUserVerified(user, { provider: 'otp' }));
});

test('email user needs emailVerified', () => {
  const user = { emailVerified: false, providerData: [{ providerId: 'password' }] };
  assert(!isUserVerified(user, { provider: 'email' }));
});

// --- Return path ---
if (typeof sessionStorage !== 'undefined') {
  test('return path survives save/consume cycle', () => {
    saveAuthReturnPath('/upload');
    const path = consumeAuthReturnPath('/dashboard');
    assert(path === '/upload', `expected /upload got ${path}`);
    const again = consumeAuthReturnPath('/dashboard');
    assert(again === '/dashboard', 'should consume once');
  });
}

// --- Auth lock ---
if (typeof sessionStorage !== 'undefined') {
  test('auth lock prevents duplicate requests', () => {
    releaseAuthLock();
    assert(acquireAuthLock('test'), 'first acquire should succeed');
    assert(!acquireAuthLock('test'), 'second acquire should fail');
    releaseAuthLock();
    assert(acquireAuthLock('test'), 'after release should succeed');
    releaseAuthLock();
  });
}

console.log(`\nAuth logic: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
