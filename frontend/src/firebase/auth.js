import { getAuth, useDeviceLanguage } from 'firebase/auth';
import app, { db, storage } from './firebase';

export { db, storage };

export const auth = getAuth(app);

useDeviceLanguage(auth);

/** Only this email can access the admin dashboard */
export const ADMIN_EMAIL = 'daakukwaku7@gmail.com';

/**
 * Admin access is restricted to ADMIN_EMAIL only.
 */
export function isAdmin(user, userProfile) {
  const email = user?.email?.toLowerCase();
  return email === ADMIN_EMAIL.toLowerCase();
}

/**
 * Assign role for Firestore user doc based on email.
 */
export function resolveUserRole(user) {
  return isAdmin(user) ? 'admin' : 'user';
}

/**
 * Check if Firebase user email is verified.
 */
export function isEmailVerified(user) {
  return user?.emailVerified === true;
}

/**
 * Default shape for new Firestore user documents.
 */
export function buildUserDoc(user, name = '', overrides = {}) {
  return {
    uid: user.uid,
    name: name || user.displayName || '',
    email: user.email || '',
    role: resolveUserRole(user),
    emailVerified: user.emailVerified || false,
    verified: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}
