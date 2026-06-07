/**
 * Clear Firestore collections (development maintenance only).
 * Run: node scripts/clearFirestore.js
 *
 * Requires FIREBASE_* credentials in backend/.env
 */
import dotenv from 'dotenv';
import { initFirebase, getDb, isFirebaseConfigured } from '../config/firebaseConfig.js';

dotenv.config();

const COLLECTIONS = ['campaigns', 'payments', 'notifications', 'analytics'];

async function deleteCollection(db, collectionPath) {
  const snapshot = await db.collection(collectionPath).get();
  if (snapshot.empty) {
    console.log(`  ${collectionPath}: already empty`);
    return 0;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  console.log(`  ${collectionPath}: deleted ${snapshot.size} documents`);
  return snapshot.size;
}

async function main() {
  initFirebase();

  if (!isFirebaseConfigured()) {
    console.error('Firebase Admin not configured. Add credentials to backend/.env');
    console.log('\nManual alternative: Firebase Console → Firestore → delete documents');
    process.exit(1);
  }

  const db = getDb();
  console.log('Clearing Firestore collections (users preserved)...\n');

  let total = 0;
  for (const col of COLLECTIONS) {
    total += await deleteCollection(db, col);
  }

  console.log(`\nDone. Deleted ${total} documents total.`);
  console.log('Users collection was NOT cleared.');
}

main().catch(console.error);
