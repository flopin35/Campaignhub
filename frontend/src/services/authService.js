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
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, resolveUserRole } from '../firebase/auth';
import { getAuthErrorMessage } from '../utils/authErrors';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth < 768
  );
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

/**
 * Google sign-in: popup on desktop, redirect on mobile.
 * Returns null when redirect is initiated (result handled via handleGoogleRedirectResult).
 */
export async function signInWithGoogle() {
  if (isMobileDevice()) {
    await signInWithRedirect(auth, googleProvider);
    return null;
  }

  try {
    const credential = await signInWithPopup(auth, googleProvider);
    const profile = await saveUserToFirestore(credential.user);
    return { user: credential.user, profile };
  } catch (err) {
    if (
      err.code === 'auth/popup-blocked' ||
      err.code === 'auth/popup-closed-by-user' ||
      err.code === 'auth/cancelled-popup-request'
    ) {
      await signInWithRedirect(auth, googleProvider);
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

/** Call on app load to complete Google redirect sign-in. */
export async function handleGoogleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (!result?.user) return null;
    const profile = await saveUserToFirestore(result.user);
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
    await saveUserToFirestore(refreshed);
  }
  return refreshed;
}

export async function logout() {
  await signOut(auth);
}
