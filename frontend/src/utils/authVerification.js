/** Email verification helpers — link handling, sync, login gates */

const VERIFY_PATH = '/verify-email';

export function getVerificationContinueUrl() {
  if (typeof window === 'undefined') {
    return 'https://www.campaignhubgh.com/verify-email';
  }
  const { origin } = window.location;
  if (origin.includes('localhost')) {
    return `${origin}${VERIFY_PATH}`;
  }
  return `https://www.campaignhubgh.com${VERIFY_PATH}`;
}

/** Parse Firebase email-action params from current URL. */
export function parseEmailActionFromUrl(search = '') {
  const params = new URLSearchParams(search || (typeof window !== 'undefined' ? window.location.search : ''));
  return {
    mode: params.get('mode'),
    oobCode: params.get('oobCode'),
    apiKey: params.get('apiKey'),
  };
}

export function hasEmailVerificationLink(search = '') {
  const { mode, oobCode } = parseEmailActionFromUrl(search);
  return mode === 'verifyEmail' && !!oobCode;
}

/** Where to send user after login/signup based on verification status. */
export function resolvePostLoginPath(isVerified, intendedPath = '/dashboard') {
  if (!isVerified) return VERIFY_PATH;
  const safe =
    typeof intendedPath === 'string' && intendedPath.startsWith('/') && !intendedPath.startsWith('//')
      ? intendedPath
      : '/dashboard';
  if (safe === VERIFY_PATH || safe === '/login' || safe === '/signup') return '/dashboard';
  return safe;
}
