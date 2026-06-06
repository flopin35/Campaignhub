import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let db = null;
let storage = null;
let initialized = false;

/**
 * Initialize Firebase Admin SDK.
 * Falls back to mock mode when credentials are not configured (dev-friendly).
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
    console.log('Firebase initialized successfully');
  } else {
    console.warn('Firebase credentials not configured — running in mock mode');
    initialized = true;
  }

  return { db, storage };
}

export function getDb() {
  if (!initialized) initFirebase();
  return db;
}

export function getStorage() {
  if (!initialized) initFirebase();
  return storage;
}

export function isFirebaseConfigured() {
  return db !== null;
}

export default admin;
