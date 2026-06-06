import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendEmailVerification,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, buildUserDoc, resolveUserRole } from '../firebase/auth';

const googleProvider = new GoogleAuthProvider();

/**
 * Fetch user profile from Firestore.
 */
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

/**
 * Create or merge user document in Firestore.
 */
export async function saveUserToFirestore(user, name = '') {
  const userRef = doc(db, 'users', user.uid);
  const existing = await getDoc(userRef);

  if (existing.exists()) {
    const role = resolveUserRole(user);
    await updateDoc(userRef, {
      emailVerified: user.emailVerified,
      name: name || user.displayName || existing.data().name,
      role,
    });
    return { ...existing.data(), emailVerified: user.emailVerified, role };
  }

  const userData = buildUserDoc(user, name);
  await setDoc(userRef, userData);
  return userData;
}

/**
 * Email/password signup with verification email.
 */
export async function signUpWithEmail(name, email, password) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const { user } = credential;

  await updateProfile(user, { displayName: name });
  await sendEmailVerification(user);
  const profile = await saveUserToFirestore(user, name);

  return { user, profile };
}

/**
 * Email/password login.
 */
export async function loginWithEmail(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const profile = await saveUserToFirestore(credential.user);
  return { user: credential.user, profile };
}

/**
 * Google sign-in popup. Creates Firestore user if new.
 */
export async function signInWithGoogle() {
  const credential = await signInWithPopup(auth, googleProvider);
  const profile = await saveUserToFirestore(credential.user);
  return { user: credential.user, profile };
}

/**
 * Resend verification email to current user.
 */
export async function resendVerificationEmail() {
  const user = auth.currentUser;
  if (!user) throw new Error('No user signed in');
  if (user.emailVerified) throw new Error('Email already verified');
  await sendEmailVerification(user);
}

/**
 * Reload Firebase user to refresh emailVerified flag.
 */
export async function refreshAuthUser() {
  const user = auth.currentUser;
  if (!user) return null;
  await user.reload();
  return auth.currentUser;
}

/**
 * Sign out and clear session.
 */
export async function logout() {
  await signOut(auth);
}
