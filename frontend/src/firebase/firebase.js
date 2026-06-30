import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/**
 * CampaignHub Firebase web app (new1-e94db).
 * Env vars override defaults for Vercel; defaults match Firebase console config.
 */
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDgq9q4FQf0Mv8_l5njSQKOmAFlpEEl2gk',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'new1-e94db.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'new1-e94db',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'new1-e94db.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '888917258575',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:888917258575:web:2ead27d13446930f13553a',
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
