import { v4 as uuidv4 } from 'uuid';
import { getDb, getStorage, isFirebaseConfigured } from '../config/firebaseConfig.js';

const COLLECTION = 'campaigns';

function assertFirebaseConfigured() {
  if (!isFirebaseConfigured()) {
    const err = new Error(
      'Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
    );
    err.statusCode = 503;
    throw err;
  }
}

function applyExpiry(campaign) {
  if (campaign.status === 'active' && campaign.expiryDate) {
    if (new Date() > new Date(campaign.expiryDate)) {
      return { ...campaign, status: 'expired' };
    }
  }
  return campaign;
}

export async function getAllCampaigns(filters = {}) {
  assertFirebaseConfigured();

  const db = getDb();
  let query = db.collection(COLLECTION);

  if (filters.status) {
    query = query.where('status', '==', filters.status);
  }

  const snapshot = await query.orderBy('createdAt', 'desc').get();
  let campaigns = snapshot.docs.map((doc) => applyExpiry({ id: doc.id, ...doc.data() }));

  if (filters.search) {
    const q = filters.search.toLowerCase();
    campaigns = campaigns.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    );
  }

  return campaigns;
}

export async function getCampaignBySlug(slug) {
  assertFirebaseConfigured();

  const db = getDb();
  const snapshot = await db.collection(COLLECTION).where('slug', '==', slug).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return applyExpiry({ id: doc.id, ...doc.data() });
}

export async function getCampaignById(id) {
  assertFirebaseConfigured();

  const db = getDb();
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return applyExpiry({ id: doc.id, ...doc.data() });
}

export async function createCampaign(data) {
  assertFirebaseConfigured();

  const id = uuidv4();
  const now = new Date().toISOString();
  const campaign = {
    id,
    ...data,
    status: 'pending',
    startDate: null,
    expiryDate: null,
    createdAt: now,
    updatedAt: now,
  };

  const db = getDb();
  await db.collection(COLLECTION).doc(id).set(campaign);
  return campaign;
}

export async function updateCampaign(id, updates) {
  assertFirebaseConfigured();

  const now = new Date().toISOString();
  const payload = { ...updates, updatedAt: now };

  const db = getDb();
  await db.collection(COLLECTION).doc(id).update(payload);
  return getCampaignById(id);
}

export async function deleteCampaign(id) {
  assertFirebaseConfigured();

  const db = getDb();
  await db.collection(COLLECTION).doc(id).delete();
  return true;
}

export async function uploadBanner(file) {
  assertFirebaseConfigured();

  const storage = getStorage();
  const bucket = storage.bucket();
  const filename = `banners/${uuidv4()}-${file.originalname}`;
  const fileRef = bucket.file(filename);

  await fileRef.save(file.buffer, {
    metadata: { contentType: file.mimetype },
  });

  await fileRef.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${filename}`;
}

export async function slugExists(slug) {
  assertFirebaseConfigured();

  const db = getDb();
  const snapshot = await db.collection(COLLECTION).where('slug', '==', slug).limit(1).get();
  return !snapshot.empty;
}
