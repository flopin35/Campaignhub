import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let db = null;
let storage = null;
let initialized = false;

/**
 * Initialize Firebase Admin SDK. Requires service account credentials.
 */
export function initFirebase() {
  if (initialized) return { db, storage };

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
    db = admin.firestore();
    storage = admin.storage();
    initialized = true;
    console.log('Firebase Admin initialized successfully');
  } else {
    initialized = true;
    console.error(
      'Firebase Admin credentials missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
    );
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Firebase Admin credentials are required in production');
    }
  }

  return { db, storage };
}

export function getDb() {
  if (!initialized) initFirebase();
  if (!db) {
    throw new Error('Firebase Admin is not configured');
  }
  return db;
}

export function getStorage() {
  if (!initialized) initFirebase();
  if (!storage) {
    throw new Error('Firebase Admin is not configured');
  }
  return storage;
}

export function isFirebaseConfigured() {
  if (!initialized) initFirebase();
  return db !== null;
}

export default admin;
