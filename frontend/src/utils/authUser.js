/** Pure auth helpers (no Firebase imports) — safe for Node tests. */

export function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    (window.innerWidth < 768 && 'ontouchstart' in window)
  );
}

export function shouldUseGoogleRedirect() {
  return isMobileDevice();
}

export function isGoogleUser(user, profile) {
  if (profile?.provider === 'google') return true;
  return user?.providerData?.some((p) => p.providerId === 'google.com') ?? false;
}

export function isOtpUser(user, profile) {
  if (profile?.provider === 'otp') return true;
  return user?.providerData?.some((p) => p.providerId === 'custom') ?? false;
}

export function isUserVerified(user, profile) {
  if (!user?.uid) return false;
  if (isGoogleUser(user, profile) || isOtpUser(user, profile)) return true;
  if (profile?.provider === 'google' || profile?.provider === 'otp') return true;
  if (user.emailVerified === true) return true;
  if (profile?.emailVerified === true) return true;
  return false;
}

export function sanitizeEmail(email) {
  return (email || '').trim().toLowerCase();
}
