import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithCustomToken,
  GoogleAuthProvider,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, resolveUserRole } from '../firebase/auth';
import { getAuthErrorMessage } from '../utils/authErrors';
import { saveAuthReturnPath } from '../utils/authRedirect';
import { authLog } from '../utils/authLogger';
import {
  acquireAuthLock,
  releaseAuthLock,
  rememberAuthProvider,
  withAuthTimeout,
} from '../utils/authSession';

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

let redirectResultPromise = null;
let persistenceSet = false;
let googleInFlight = false;

function getRedirectResultOnce() {
  if (!redirectResultPromise) {
    redirectResultPromise = getRedirectResult(auth).catch((err) => {
      redirectResultPromise = null;
      throw err;
    });
  }
  return redirectResultPromise;
}

async function ensureLocalPersistence() {
  if (persistenceSet || typeof window === 'undefined') return;
  await setPersistence(auth, browserLocalPersistence);
  persistenceSet = true;
  authLog.session('Local persistence enabled');
}

export function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    (window.innerWidth < 768 && 'ontouchstart' in window)
  );
}

/** Desktop = popup. Mobile = redirect only. */
export function shouldUseGoogleRedirect() {
  return isMobileDevice();
}

function getProviderFromUser(user) {
  if (user.providerData?.some((p) => p.providerId === 'google.com')) return 'google';
  if (user.providerData?.some((p) => p.providerId === 'custom')) return 'otp';
  return 'email';
}

function buildProfileData(user, name = '', extras = {}) {
  const provider = extras.provider || getProviderFromUser(user);
  return {
    uid: user.uid,
    displayName: name || user.displayName || '',
    name: name || user.displayName || '',
    email: user.email || '',
    photoURL: user.photoURL || '',
    provider,
    verified: provider === 'google' || provider === 'otp' ? true : !!user.emailVerified,
    emailVerified: provider === 'otp' ? true : !!user.emailVerified,
    role: resolveUserRole(user),
    premiumStatus: extras.premiumStatus || 'free',
    campaignsCreated: extras.campaignsCreated ?? 0,
    lastLogin: serverTimestamp(),
  };
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

export async function saveUserToFirestore(user, name = '', extras = {}) {
  const userRef = doc(db, 'users', user.uid);
  const existing = await getDoc(userRef);
  const existingData = existing.exists() ? existing.data() : {};
  const profileData = buildProfileData(user, name, {
    ...extras,
    premiumStatus: existingData.premiumStatus || extras.premiumStatus || 'free',
    campaignsCreated: existingData.campaignsCreated ?? extras.campaignsCreated ?? 0,
  });

  if (existing.exists()) {
    await updateDoc(userRef, {
      ...profileData,
      createdAt: existingData.createdAt,
      updatedAt: serverTimestamp(),
    });
    return { ...existingData, ...profileData };
  }

  await setDoc(userRef, {
    ...profileData,
    createdAt: serverTimestamp(),
  });
  return profileData;
}

async function saveProfileSafe(user, name = '', extras = {}) {
  try {
    return await saveUserToFirestore(user, name, extras);
  } catch (err) {
    authLog.error('Profile save failed', err.message);
    return null;
  }
}

export async function signUpWithEmail(name, email, password) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const { user } = credential;
  await updateProfile(user, { displayName: name });
  await sendEmailVerification(user);
  rememberAuthProvider('email');
  const profile = await saveUserToFirestore(user, name);
  return { user, profile };
}

export async function loginWithEmail(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  rememberAuthProvider('email');
  const profile = await saveUserToFirestore(credential.user);
  return { user: credential.user, profile };
}

export async function signInWithOtpCustomToken(customToken) {
  if (!acquireAuthLock('otp')) {
    throw new Error('Sign-in already in progress. Please wait.');
  }
  try {
    authLog.otp('Signing in with custom token');
    await ensureLocalPersistence();
    const credential = await withAuthTimeout(
      signInWithCustomToken(auth, customToken),
      30000,
      'OTP sign-in'
    );
    rememberAuthProvider('otp');
    const profile = await saveProfileSafe(credential.user, '', { provider: 'otp' });
    return { user: credential.user, profile };
  } finally {
    releaseAuthLock();
  }
}

async function startGoogleRedirect(returnTo) {
  saveAuthReturnPath(returnTo || '/dashboard');
  await ensureLocalPersistence();
  authLog.google('Starting redirect flow');
  await signInWithRedirect(auth, googleProvider);
}

export async function signInWithGoogle({ returnTo = '/dashboard' } = {}) {
  if (googleInFlight) {
    authLog.google('Duplicate Google request blocked');
    throw new Error('Sign-in already in progress.');
  }
  if (!acquireAuthLock('google')) {
    throw new Error('Sign-in already in progress. Please wait.');
  }

  googleInFlight = true;
  try {
    if (shouldUseGoogleRedirect()) {
      await startGoogleRedirect(returnTo);
      return null;
    }

    await ensureLocalPersistence();
    authLog.google('Starting popup flow');

    const credential = await withAuthTimeout(
      signInWithPopup(auth, googleProvider),
      45000,
      'Google sign-in'
    );
    rememberAuthProvider('google');
    const profile = await saveProfileSafe(credential.user);
    return { user: credential.user, profile };
  } catch (err) {
    if (
      err.code === 'auth/popup-blocked' ||
      err.code === 'auth/popup-closed-by-user' ||
      err.code === 'auth/cancelled-popup-request'
    ) {
      if (err.code === 'auth/popup-blocked') {
        authLog.recovery('Popup blocked — falling back to redirect');
        await startGoogleRedirect(returnTo);
        return null;
      }
      throw new Error(getAuthErrorMessage(err.code) || 'Sign-in was cancelled.');
    }
    if (err.code === 'auth/account-exists-with-different-credential') {
      throw new Error(
        'An account already exists with this email using a different sign-in method.'
      );
    }
    throw new Error(getAuthErrorMessage(err.code) || err.message);
  } finally {
    googleInFlight = false;
    releaseAuthLock();
  }
}

/** Complete Google redirect — NEVER call setPersistence before this. */
export async function handleGoogleRedirectResult() {
  authLog.google('Checking redirect result');
  try {
    const result = await withAuthTimeout(getRedirectResultOnce(), 30000, 'Google redirect');
    if (!result?.user) return null;
    rememberAuthProvider('google');
    authLog.google('Redirect sign-in success', result.user.email);
    const profile = await saveProfileSafe(result.user);
    return { user: result.user, profile };
  } catch (err) {
    if (err.code === 'auth/account-exists-with-different-credential') {
      throw new Error(
        'An account already exists with this email using a different sign-in method.'
      );
    }
    throw new Error(getAuthErrorMessage(err.code) || err.message);
  }
}

export async function sendPasswordReset(email) {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function resendVerificationEmail() {
  const user = auth.currentUser;
  if (!user) throw new Error('No user signed in');
  if (user.emailVerified) throw new Error('Email already verified');
  await sendEmailVerification(user);
}

export async function refreshAuthUser() {
  const user = auth.currentUser;
  if (!user) return null;
  await user.reload();
  const refreshed = auth.currentUser;
  if (refreshed) await saveProfileSafe(refreshed);
  return refreshed;
}

export async function logout() {
  authLog.session('Signing out');
  await signOut(auth);
  redirectResultPromise = null;
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
  if (!user) return false;
  if (isGoogleUser(user, profile) || isOtpUser(user, profile)) return true;
  return user.emailVerified === true;
}

export function sanitizeEmail(email) {
  return (email || '').trim().toLowerCase();
}
