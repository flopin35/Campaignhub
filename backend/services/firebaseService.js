import { v4 as uuidv4 } from 'uuid';
import { getDb, getStorage, isFirebaseConfigured } from '../config/firebaseConfig.js';

const COLLECTION = 'campaigns';

// In-memory mock store for development without Firebase credentials
export const mockCampaigns = [
  {
    id: '1',
    title: 'Marine Security Awareness',
    slug: 'marine-security-awareness',
    description: 'Raising awareness about marine security and coastal safety for communities worldwide.',
    contactEmail: 'contact@marineaware.org',
    contactPhone: '+1 555-0100',
    bannerUrl: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80',
    status: 'active',
    durationDays: 30,
    startDate: new Date(Date.now() - 5 * 86400000).toISOString(),
    expiryDate: new Date(Date.now() + 25 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Nelis Foundation Drive',
    slug: 'nelis-foundation-drive',
    description: 'Community fundraising campaign supporting education initiatives in underserved regions.',
    contactEmail: 'info@nelisfoundation.org',
    contactPhone: '+1 555-0200',
    bannerUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80',
    status: 'active',
    durationDays: 14,
    startDate: new Date(Date.now() - 3 * 86400000).toISOString(),
    expiryDate: new Date(Date.now() + 11 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Green Earth Initiative',
    slug: 'green-earth-initiative',
    description: 'Promoting sustainable practices and environmental conservation across urban communities.',
    contactEmail: 'hello@greenearth.org',
    contactPhone: '+1 555-0300',
    bannerUrl: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80',
    status: 'pending',
    durationDays: 21,
    startDate: null,
    expiryDate: null,
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function applyExpiry(campaign) {
  if (campaign.status === 'active' && campaign.expiryDate) {
    if (new Date() > new Date(campaign.expiryDate)) {
      return { ...campaign, status: 'expired' };
    }
  }
  return campaign;
}

export async function getAllCampaigns(filters = {}) {
  if (!isFirebaseConfigured()) {
    let results = mockCampaigns.map(applyExpiry);
    if (filters.status) results = results.filter((c) => c.status === filters.status);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      );
    }
    return results;
  }

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
  if (!isFirebaseConfigured()) {
    const campaign = mockCampaigns.find((c) => c.slug === slug);
    return campaign ? applyExpiry(campaign) : null;
  }

  const db = getDb();
  const snapshot = await db.collection(COLLECTION).where('slug', '==', slug).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return applyExpiry({ id: doc.id, ...doc.data() });
}

export async function getCampaignById(id) {
  if (!isFirebaseConfigured()) {
    const campaign = mockCampaigns.find((c) => c.id === id);
    return campaign ? applyExpiry(campaign) : null;
  }

  const db = getDb();
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) return null;
  return applyExpiry({ id: doc.id, ...doc.data() });
}

export async function createCampaign(data) {
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

  if (!isFirebaseConfigured()) {
    mockCampaigns.unshift(campaign);
    return campaign;
  }

  const db = getDb();
  await db.collection(COLLECTION).doc(id).set(campaign);
  return campaign;
}

export async function updateCampaign(id, updates) {
  const now = new Date().toISOString();
  const payload = { ...updates, updatedAt: now };

  if (!isFirebaseConfigured()) {
    const idx = mockCampaigns.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    mockCampaigns[idx] = { ...mockCampaigns[idx], ...payload };
    return mockCampaigns[idx];
  }

  const db = getDb();
  await db.collection(COLLECTION).doc(id).update(payload);
  return getCampaignById(id);
}

export async function deleteCampaign(id) {
  if (!isFirebaseConfigured()) {
    const idx = mockCampaigns.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    mockCampaigns.splice(idx, 1);
    return true;
  }

  const db = getDb();
  await db.collection(COLLECTION).doc(id).delete();
  return true;
}

export async function uploadBanner(file) {
  if (!isFirebaseConfigured()) {
    // Return a placeholder URL in mock mode
    return `https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&q=80&mock=${Date.now()}`;
  }

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
  if (!isFirebaseConfigured()) {
    return mockCampaigns.some((c) => c.slug === slug);
  }

  const db = getDb();
  const snapshot = await db.collection(COLLECTION).where('slug', '==', slug).limit(1).get();
  return !snapshot.empty;
}
