import {
  doc,
  getDoc,
  setDoc,
  increment,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/auth';

const ANALYTICS = 'analytics';

const DEFAULT_STATS = {
  totalViews: 0,
  qrScans: 0,
  directVisits: 0,
  // Inbound traffic (?ref=) — who clicked your link
  whatsappVisits: 0,
  facebookVisits: 0,
  twitterVisits: 0,
  telegramVisits: 0,
  linkedinVisits: 0,
  instagramVisits: 0,
  tiktokVisits: 0,
  // Outbound share button clicks
  whatsappShares: 0,
  facebookShares: 0,
  twitterShares: 0,
  telegramShares: 0,
  linkedinShares: 0,
  instagramShares: 0,
  tiktokShares: 0,
  linkCopies: 0,
  ctaClicks: 0,
  leadSignups: 0,
};

/** Inbound referral → visit field */
const REFERRAL_VISIT_MAP = {
  whatsapp: 'whatsappVisits',
  facebook: 'facebookVisits',
  twitter: 'twitterVisits',
  telegram: 'telegramVisits',
  linkedin: 'linkedinVisits',
  instagram: 'instagramVisits',
  tiktok: 'tiktokVisits',
};

/** Outbound share button → share field */
const PLATFORM_SHARE_MAP = {
  whatsapp: 'whatsappShares',
  facebook: 'facebookShares',
  twitter: 'twitterShares',
  telegram: 'telegramShares',
  linkedin: 'linkedinShares',
  instagram: 'instagramShares',
  tiktok: 'tiktokShares',
};

function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `d${y}${m}${d}`;
}

/** Increment counters. setDoc+merge with increment() creates the doc if needed and never resets totals. */
async function bump(campaignId, fields, nested = {}) {
  try {
    const ref = doc(db, ANALYTICS, campaignId);
    const payload = { campaignId, updatedAt: serverTimestamp() };
    Object.entries(fields).forEach(([key, val]) => {
      payload[key] = increment(val);
    });
    Object.entries(nested).forEach(([mapName, entries]) => {
      payload[mapName] = {};
      Object.entries(entries).forEach(([k, v]) => {
        payload[mapName][k] = increment(v);
      });
    });
    await setDoc(ref, payload, { merge: true });
  } catch (err) {
    console.warn('Analytics update skipped:', err.message);
  }
}

/** Valid ad tracking codes are short lowercase/alnum strings created by the Ads manager. */
export function getAdCode(searchParams) {
  const code = searchParams?.get?.('ad') || '';
  return /^[a-z0-9]{4,12}$/.test(code) ? code : '';
}

/** Track page visit with referral source (?ref=) */
export async function trackVisit(campaignId, referral = 'direct', adCode = '') {
  const { incrementCampaignField } = await import('./campaignFirestoreService');
  await incrementCampaignField(campaignId, 'views');

  const fields = { totalViews: 1 };

  if (adCode) {
    fields.adVisitsTotal = 1;
  } else if (referral === 'qr') {
    fields.qrScans = 1;
  } else if (referral === 'direct') {
    fields.directVisits = 1;
  } else if (REFERRAL_VISIT_MAP[referral]) {
    fields[REFERRAL_VISIT_MAP[referral]] = 1;
  }

  const nested = { daily: { [dayKey()]: 1 } };
  if (adCode) nested.adVisits = { [adCode]: 1 };
  await bump(campaignId, fields, nested);
}

export async function trackLinkCopy(campaignId) {
  await bump(campaignId, { linkCopies: 1 });
}

/** Outbound share button click (not the same as inbound visit) */
export async function trackPlatformShare(campaignId, platform) {
  const { incrementCampaignField } = await import('./campaignFirestoreService');
  await incrementCampaignField(campaignId, 'shares');

  const field = PLATFORM_SHARE_MAP[platform];
  if (field) await bump(campaignId, { [field]: 1 });
}

export async function trackQrScan(campaignId) {
  await trackVisit(campaignId, 'qr');
}

export async function trackView(campaignId, referral = 'direct') {
  return trackVisit(campaignId, referral);
}

export async function trackShare(campaignId, platform = 'whatsapp') {
  return trackPlatformShare(campaignId, platform);
}

/** CTA clicks — donate, join, follow, contact */
export async function trackClick(campaignId) {
  const { incrementCampaignField } = await import('./campaignFirestoreService');
  await incrementCampaignField(campaignId, 'clicks');
  await bump(campaignId, { ctaClicks: 1 });
}

export async function trackLeadSignup(campaignId, adCode = '') {
  const nested = { dailySignups: { [dayKey()]: 1 } };
  if (adCode) nested.adSignups = { [adCode]: 1 };
  await bump(campaignId, { leadSignups: 1 }, nested);
  return trackClick(campaignId);
}

/** Last N days of a daily map → [{ x: 'Oct 6', key, value }] */
export function dailySeries(map = {}, days = 30) {
  const out = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = dayKey(d);
    out.push({
      x: d.toLocaleDateString('en-GH', { day: 'numeric', month: 'short' }),
      key,
      value: Number(map?.[key] || 0),
    });
  }
  return out;
}

export function subscribeCampaignAnalytics(campaignId, callback) {
  const ref = doc(db, ANALYTICS, campaignId);
  return onSnapshot(
    ref,
    (snap) => {
      callback(snap.exists() ? snap.data() : { campaignId, ...DEFAULT_STATS });
    },
    () => {
      callback({ campaignId, ...DEFAULT_STATS });
    },
  );
}

export async function getCampaignAnalytics(campaignId) {
  const snap = await getDoc(doc(db, ANALYTICS, campaignId));
  return snap.exists() ? snap.data() : { campaignId, ...DEFAULT_STATS };
}

export function getViralScore(stats = {}, campaign = {}) {
  const waTraffic = (stats.whatsappVisits ?? stats.whatsappShares ?? 0);
  return (
    (stats.totalViews || campaign.views || 0) * 1 +
    (stats.qrScans || 0) * 3 +
    (stats.linkCopies || 0) * 2 +
    waTraffic * 4 +
    (stats.facebookVisits ?? stats.facebookShares ?? 0) * 3 +
    (stats.leadSignups || 0) * 8 +
    (stats.ctaClicks || 0) * 3 +
    (campaign.followerCount || 0) * 5 +
    (campaign.commentCount || 0) * 2 +
    (campaign.clicks || stats.clicks || 0) * 2
  );
}

export function getGrowthScore(stats = {}, campaign = {}) {
  const viral = getViralScore(stats, campaign);
  const recentBoost = (stats.totalViews || 0) > 10 ? 1.5 : 1;
  return Math.round(viral * recentBoost + (campaign.followerCount || 0) * 3);
}

export function getShareScore(stats = {}) {
  return (
    (stats.whatsappShares || 0) +
    (stats.facebookShares || 0) +
    (stats.twitterShares || 0) +
    (stats.telegramShares || 0) +
    (stats.linkedinShares || 0) +
    (stats.instagramShares || 0) +
    (stats.tiktokShares || 0) +
    (stats.linkCopies || 0)
  );
}

export { DEFAULT_STATS };
