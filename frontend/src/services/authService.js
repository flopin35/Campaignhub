import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
googleProvider.addScope('email');
googleProvider.addScope('profile');

/** Ensure getRedirectResult runs only once (React StrictMode safe). */
let redirectResultPromise = null;

function getRedirectResultOnce() {
  if (!redirectResultPromise) {
    redirectResultPromise = getRedirectResult(auth).catch((err) => {
      redirectResultPromise = null;
      throw err;
    });
  }
  return redirectResultPromise;
}

/**
 * Set persistence before starting sign-in — NEVER call before getRedirectResult on page load
 * (that clears the pending OAuth result and breaks Google redirect sign-in).
 */
async function prepareForSignIn() {
  if (typeof window === 'undefined') return;
  await setPersistence(auth, browserLocalPersistence);
}

async function saveProfileSafe(user, name = '') {
  try {
    return await saveUserToFirestore(user, name);
  } catch (err) {
    console.error('Could not save user profile:', err);
    return null;
  }
}

export function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth < 768
  );
}

/** Redirect is most reliable on mobile, in-app browsers, and production HTTPS. */
export function shouldUseGoogleRedirect() {
  if (typeof window === 'undefined') return false;
  if (import.meta.env.PROD) return true;
  if (isMobileDevice()) return true;
  if (/FBAN|FBAV|Instagram|Line\//i.test(navigator.userAgent)) return true;
  return false;
}

function getProviderFromUser(user) {
  const isGoogle = user.providerData?.some((p) => p.providerId === 'google.com');
  return isGoogle ? 'google' : 'email';
}

function buildProfileData(user, name = '') {
  const provider = getProviderFromUser(user);
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
  };
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

export async function saveUserToFirestore(user, name = '') {
  const userRef = doc(db, 'users', user.uid);
  const existing = await getDoc(userRef);
  const profileData = buildProfileData(user, name);

  if (existing.exists()) {
    await updateDoc(userRef, {
      ...profileData,
      updatedAt: serverTimestamp(),
    });
    return { ...existing.data(), ...profileData };
  }

  await setDoc(userRef, {
    ...profileData,
    createdAt: serverTimestamp(),
  });
  return profileData;
}

export async function signUpWithEmail(name, email, password) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const { user } = credential;

  await updateProfile(user, { displayName: name });
  await sendEmailVerification(user);
  const profile = await saveUserToFirestore(user, name);

  return { user, profile };
}

export async function loginWithEmail(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const profile = await saveUserToFirestore(credential.user);
  return { user: credential.user, profile };
}

async function startGoogleRedirect(returnTo) {
  saveAuthReturnPath(returnTo || '/dashboard');
  await prepareForSignIn();
  await signInWithRedirect(auth, googleProvider);
}

/**
 * Google sign-in. Returns null when redirect flow starts (completed on return via handleGoogleRedirectResult).
 */
export async function signInWithGoogle({ returnTo = '/dashboard' } = {}) {
  if (shouldUseGoogleRedirect()) {
    await startGoogleRedirect(returnTo);
    return null;
  }

  await prepareForSignIn();

  try {
    const credential = await signInWithPopup(auth, googleProvider);
    const profile = await saveProfileSafe(credential.user);
    return { user: credential.user, profile };
  } catch (err) {
    if (
      err.code === 'auth/popup-blocked' ||
      err.code === 'auth/popup-closed-by-user' ||
      err.code === 'auth/cancelled-popup-request'
    ) {
      await startGoogleRedirect(returnTo);
      return null;
    }
    if (err.code === 'auth/account-exists-with-different-credential') {
      throw new Error(
        'An account already exists with this email using a different sign-in method. Try signing in with email and password.'
      );
    }
    throw new Error(getAuthErrorMessage(err.code) || err.message);
  }
}

/**
 * Complete Google redirect sign-in after page reload.
 * Must NOT call setPersistence here — that wipes the pending OAuth result.
 */
export async function handleGoogleRedirectResult() {
  try {
    const result = await getRedirectResultOnce();
    if (!result?.user) return null;
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
  if (refreshed) {
    await saveProfileSafe(refreshed);
  }
  return refreshed;
}

export async function logout() {
  await signOut(auth);
}

export function isGoogleUser(user, profile) {
  if (profile?.provider === 'google') return true;
  return user?.providerData?.some((p) => p.providerId === 'google.com') ?? false;
}

export function isUserVerified(user, profile) {
  if (!user) return false;
  if (isGoogleUser(user, profile)) return true;
  return user.emailVerified === true;
}
