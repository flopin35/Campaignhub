import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/auth';

const ANALYTICS = 'analytics';

const DEFAULT_STATS = {
  totalViews: 0,
  qrScans: 0,
  whatsappShares: 0,
  facebookShares: 0,
  twitterShares: 0,
  telegramShares: 0,
  linkedinShares: 0,
  linkCopies: 0,
  directVisits: 0,
};

/** Ensure analytics doc exists for campaign */
async function ensureAnalyticsDoc(campaignId) {
  const ref = doc(db, ANALYTICS, campaignId);
  try {
    await setDoc(
      ref,
      { campaignId, ...DEFAULT_STATS, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (err) {
    console.warn('Analytics doc init skipped:', err.message);
  }
  return ref;
}

/** Atomically increment analytics fields */
async function bump(campaignId, fields) {
  try {
    const ref = await ensureAnalyticsDoc(campaignId);
    const updates = { updatedAt: serverTimestamp() };
    Object.entries(fields).forEach(([key, val]) => {
      updates[key] = increment(val);
    });
    await updateDoc(ref, updates);
  } catch (err) {
    console.warn('Analytics update skipped:', err.message);
  }
}

/** Track page visit with referral source */
export async function trackVisit(campaignId, referral = 'direct') {
  const { incrementCampaignField } = await import('./campaignFirestoreService');
  await incrementCampaignField(campaignId, 'views');

  const fields = { totalViews: 1 };

  if (referral === 'qr') {
    fields.qrScans = 1;
  } else if (referral === 'direct') {
    fields.directVisits = 1;
  }
  // Social ref visits count as totalViews only — share counters updated on share click

  await bump(campaignId, fields);
}

export async function trackLinkCopy(campaignId) {
  await bump(campaignId, { linkCopies: 1 });
}

export async function trackPlatformShare(campaignId, platform) {
  const { incrementCampaignField } = await import('./campaignFirestoreService');
  await incrementCampaignField(campaignId, 'shares');

  const map = {
    whatsapp: { whatsappShares: 1 },
    facebook: { facebookShares: 1 },
    twitter: { twitterShares: 1 },
    telegram: { telegramShares: 1 },
    linkedin: { linkedinShares: 1 },
  };
  if (map[platform]) await bump(campaignId, map[platform]);
}

export async function trackQrScan(campaignId) {
  await trackVisit(campaignId, 'qr');
}

/** Legacy wrappers */
export async function trackView(campaignId, referral = 'direct') {
  return trackVisit(campaignId, referral);
}

export async function trackShare(campaignId, platform = 'whatsapp') {
  return trackPlatformShare(campaignId, platform);
}

export async function trackClick(campaignId) {
  const { incrementCampaignField } = await import('./campaignFirestoreService');
  await incrementCampaignField(campaignId, 'clicks');
}

/** Real-time subscribe to campaign analytics */
export function subscribeCampaignAnalytics(campaignId, callback) {
  const ref = doc(db, ANALYTICS, campaignId);
  return onSnapshot(
    ref,
    (snap) => {
      callback(snap.exists() ? snap.data() : { campaignId, ...DEFAULT_STATS });
    },
    () => {
      callback({ campaignId, ...DEFAULT_STATS });
    }
  );
}

/** Get analytics once */
export async function getCampaignAnalytics(campaignId) {
  const snap = await getDoc(doc(db, ANALYTICS, campaignId));
  return snap.exists() ? snap.data() : { campaignId, ...DEFAULT_STATS };
}

/** Viral score for sorting trending campaigns */
export function getViralScore(stats = {}, campaign = {}) {
  return (
    (stats.totalViews || campaign.views || 0) * 1 +
    (stats.qrScans || 0) * 3 +
    (stats.linkCopies || 0) * 2 +
    (stats.whatsappShares || 0) * 4 +
    (stats.facebookShares || 0) * 3 +
    (stats.twitterShares || 0) * 3 +
    (stats.telegramShares || 0) * 3 +
    (stats.linkedinShares || 0) * 2 +
    (campaign.followerCount || 0) * 5 +
    (campaign.commentCount || 0) * 2 +
    (campaign.clicks || stats.clicks || 0) * 2
  );
}

/** Growth score — emphasizes recent engagement velocity */
export function getGrowthScore(stats = {}, campaign = {}) {
  const viral = getViralScore(stats, campaign);
  const recentBoost = (stats.totalViews || 0) > 10 ? 1.5 : 1;
  return Math.round(viral * recentBoost + (campaign.followerCount || 0) * 3);
}

/** Total share actions for "Most Shared" ranking */
export function getShareScore(stats = {}) {
  return (
    (stats.whatsappShares || 0) +
    (stats.facebookShares || 0) +
    (stats.twitterShares || 0) +
    (stats.telegramShares || 0) +
    (stats.linkedinShares || 0) +
    (stats.linkCopies || 0)
  );
}

export { DEFAULT_STATS };
