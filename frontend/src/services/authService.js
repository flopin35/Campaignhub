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
  applyActionCode,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, resolveUserRole } from '../firebase/auth';
import { getAuthErrorMessage } from '../utils/authErrors';
import { getVerificationContinueUrl, getEmailSignInContinueUrl } from '../utils/authVerification';
import {
  isMobileDevice,
  shouldUseGoogleRedirect,
  isGoogleUser,
  isOtpUser,
  isUserVerified,
  sanitizeEmail,
} from '../utils/authUser';
import { saveAuthReturnPath } from '../utils/authRedirect';
import { authLog } from '../utils/authLogger';
import {
  acquireAuthLock,
  releaseAuthLock,
  rememberAuthProvider,
  withAuthTimeout,
} from '../utils/authSession';

export { isMobileDevice, shouldUseGoogleRedirect, isGoogleUser, isOtpUser, isUserVerified, sanitizeEmail };

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

const EMAIL_FOR_SIGN_IN_KEY = 'campaignhub_email_for_sign_in';

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
  await sendVerificationEmail(user);
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
    await credential.user.reload();
    await credential.user.getIdToken(true);
    const profile = await saveProfileSafe(credential.user, '', { provider: 'otp' });
    return { user: auth.currentUser, profile };
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

function clearEmailActionParamsFromUrl() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete('mode');
  url.searchParams.delete('oobCode');
  url.searchParams.delete('apiKey');
  url.searchParams.delete('lang');
  window.history.replaceState({}, '', url.pathname + url.search);
}

/** Passwordless sign-in link (Firebase client — no server Admin SDK required). */
export async function sendEmailSignInLink(email) {
  const normalized = sanitizeEmail(email);
  if (!normalized) throw new Error('Enter a valid email address.');
  await sendSignInLinkToEmail(auth, normalized, {
    url: getEmailSignInContinueUrl(),
    handleCodeInApp: true,
  });
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, normalized);
  }
  authLog.info('Email sign-in link sent', normalized);
}

export async function completeEmailLinkSignIn(url = '') {
  const href = url || (typeof window !== 'undefined' ? window.location.href : '');
  if (!href || !isSignInWithEmailLink(auth, href)) return null;

  let email = typeof window !== 'undefined' ? window.localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY) : null;
  if (!email) {
    throw new Error(
      'Open the sign-in link on the same device and browser where you requested it, or use password login.'
    );
  }

  authLog.info('Completing email link sign-in', email);
  const credential = await signInWithEmailLink(auth, email, href);
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY);
  }
  rememberAuthProvider('email');
  const profile = await saveUserToFirestore(credential.user);
  clearEmailActionParamsFromUrl();
  return { user: credential.user, profile };
}

/** Send verification email with return URL to /verify-email */
export async function sendVerificationEmail(user = auth.currentUser) {
  if (!user) throw new Error('No user signed in');
  if (user.emailVerified) throw new Error('Email already verified');
  await sendEmailVerification(user, {
    url: getVerificationContinueUrl(),
    handleCodeInApp: true,
  });
  authLog.info('Verification email sent', user.email);
}

export async function resendVerificationEmail() {
  return sendVerificationEmail();
}

/**
 * Apply email verification link (oobCode from inbox link).
 * Returns true if verification was applied.
 */
export async function handleEmailVerificationLink(search = '') {
  const params = new URLSearchParams(search || (typeof window !== 'undefined' ? window.location.search : ''));
  const mode = params.get('mode');
  const oobCode = params.get('oobCode');

  if (mode !== 'verifyEmail' || !oobCode) return false;

  authLog.info('Applying email verification link');
  await applyActionCode(auth, oobCode);

  const user = auth.currentUser;
  if (user) {
    await user.reload();
    await user.getIdToken(true);
    await saveProfileSafe(auth.currentUser);
    authLog.info('Email verified via link', user.email);
  }

  if (typeof window !== 'undefined') {
    clearEmailActionParamsFromUrl();
  }

  return true;
}

/** Reload user, refresh JWT (for Firestore rules), sync profile. */
export async function refreshAuthUser() {
  const user = auth.currentUser;
  if (!user) return null;
  await user.reload();
  const refreshed = auth.currentUser;
  if (refreshed) {
    await refreshed.getIdToken(true);
    await saveProfileSafe(refreshed);
  }
  return refreshed;
}

/** Poll-friendly check — returns whether user is verified after reload. */
export async function checkEmailVerificationStatus() {
  const refreshed = await refreshAuthUser();
  if (!refreshed) return { verified: false, user: null };
  const profile = await getUserProfile(refreshed.uid);
  return {
    verified: isUserVerified(refreshed, profile),
    user: refreshed,
    profile,
  };
}

export async function logout() {
  authLog.session('Signing out');
  await signOut(auth);
  redirectResultPromise = null;
}
