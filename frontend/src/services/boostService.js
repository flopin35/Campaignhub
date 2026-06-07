import { doc, updateDoc, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/auth';
import { toDate } from '../utils/campaignHelpers';

const CAMPAIGNS = 'campaigns';

/**
 * Admin: activate a time-limited boost on an active campaign.
 */
export async function activateCampaignBoost(campaignId, boostPackage, campaign = {}) {
  const expiresAt = new Date(Date.now() + boostPackage.durationMs);

  const updates = {
    boostActive: true,
    boostType: boostPackage.id,
    boostName: boostPackage.name,
    boostPriority: boostPackage.priority,
    boostExpiresAt: Timestamp.fromDate(expiresAt),
    updatedAt: serverTimestamp(),
  };

  if (boostPackage.featured) {
    updates.featured = true;
    updates.featuredFromBoost = true;
  }

  await updateDoc(doc(db, CAMPAIGNS, campaignId), updates);

  return { expiresAt: expiresAt.toISOString() };
}

/**
 * Admin: clear boost immediately.
 */
export async function clearCampaignBoost(campaignId, campaign = {}) {
  await updateDoc(doc(db, CAMPAIGNS, campaignId), {
    boostActive: false,
    boostType: null,
    boostName: null,
    boostPriority: 0,
    boostExpiresAt: null,
    featured: campaign.featuredFromBoost ? (campaign.packageFeatured || false) : campaign.featured,
    featuredFromBoost: false,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Batch-clear expired boosts (admin-only writes).
 */
export async function expireCampaignBoosts(campaigns) {
  const now = Date.now();
  const batch = writeBatch(db);
  let count = 0;

  campaigns.forEach((c) => {
    if (!c.boostActive || !c.boostExpiresAt) return;
    const expires = toDate(c.boostExpiresAt) || new Date(c.boostExpiresAt);
    if (expires && now > expires.getTime()) {
      batch.update(doc(db, CAMPAIGNS, c.id), {
        boostActive: false,
        boostType: null,
        boostName: null,
        boostPriority: 0,
        boostExpiresAt: null,
        featured: c.featuredFromBoost ? (c.packageFeatured || false) : c.featured,
        featuredFromBoost: false,
        updatedAt: serverTimestamp(),
      });
      count++;
    }
  });

  if (count > 0) {
    try {
      await batch.commit();
    } catch (err) {
      console.warn('Boost expiry sync skipped:', err.message);
    }
  }
  return count;
}
