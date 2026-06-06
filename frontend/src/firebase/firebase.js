import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDaU9ckYnWCiQktFl0v0klqZqawHK_FeGU',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'campaign-hub-b33c6.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'campaign-hub-b33c6',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'campaign-hub-b33c6.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '976071805967',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:976071805967:web:dfd66629ed30123b4da77a',
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
