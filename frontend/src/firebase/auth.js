import { getAuth, useDeviceLanguage } from 'firebase/auth';
import app, { db, storage } from './firebase';

export { db, storage };

export const auth = getAuth(app);

useDeviceLanguage(auth);

/** Only this email can access the admin dashboard */
export const ADMIN_EMAIL = 'daakukwaku7@gmail.com';

export function isAdmin(user, userProfile) {
  const email = user?.email?.toLowerCase();
  if (email === ADMIN_EMAIL.toLowerCase()) return true;
  return userProfile?.role === 'admin';
}

export function resolveUserRole(user) {
  return isAdmin(user) ? 'admin' : 'user';
}

export function isEmailVerified(user) {
  return user?.emailVerified === true;
}

/** @deprecated Use authService.saveUserToFirestore */
export function buildUserDoc(user, name = '', overrides = {}) {
  const provider = user.providerData?.some((p) => p.providerId === 'google.com') ? 'google' : 'email';
  return {
    uid: user.uid,
    displayName: name || user.displayName || '',
    name: name || user.displayName || '',
    email: user.email || '',
    photoURL: user.photoURL || '',
    provider,
    verified: provider === 'google' ? true : !!user.emailVerified,
    emailVerified: !!user.emailVerified,
    role: resolveUserRole(user),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}
