import { PREMIUM_FEATURE_IDS, SUBSCRIPTION_PACKAGE } from '../data/premiumPackages';

function isActiveEntry(entry) {
  if (!entry?.active) return false;
  if (!entry.expiresAt) return true;
  const exp = entry.expiresAt?.toDate?.() || new Date(entry.expiresAt);
  return exp.getTime() > Date.now();
}

export function getCampaignPremiumFeatures(campaign) {
  return campaign?.premiumFeatures || {};
}

export function hasPremiumFeature(campaign, featureId) {
  const features = getCampaignPremiumFeatures(campaign);
  return isActiveEntry(features[featureId]);
}

/** Active ₵500/mo subscription or all bundled features */
export function hasPremiumSubscription(campaign) {
  if (!campaign) return false;
  if (hasPremiumFeature(campaign, PREMIUM_FEATURE_IDS.PREMIUM_SUBSCRIPTION)) return true;
  return SUBSCRIPTION_PACKAGE.includes.every((id) => hasPremiumFeature(campaign, id));
}

/** Human-readable premium status for active subscribers */
export function getPremiumExpiryLabel(campaign) {
  if (!hasPremiumSubscription(campaign)) return '';
  const features = getCampaignPremiumFeatures(campaign);
  const entry = features[PREMIUM_FEATURE_IDS.PREMIUM_SUBSCRIPTION]
    || SUBSCRIPTION_PACKAGE.includes.map((id) => features[id]).find(isActiveEntry);
  if (!entry?.expiresAt) return 'Active';
  const exp = entry.expiresAt?.toDate?.() || new Date(entry.expiresAt);
  const days = Math.ceil((exp.getTime() - Date.now()) / 86400000);
  if (days <= 0) return 'Renews soon';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

export function hasAdvancedAnalytics(campaign) {
  return hasPremiumFeature(campaign, PREMIUM_FEATURE_IDS.ADVANCED_ANALYTICS)
    || hasPremiumSubscription(campaign);
}

export function hasAiAssistant(campaign) {
  return hasPremiumFeature(campaign, PREMIUM_FEATURE_IDS.AI_ASSISTANT)
    || hasPremiumSubscription(campaign);
}

export function hasMultiPlatform(campaign) {
  return hasPremiumFeature(campaign, PREMIUM_FEATURE_IDS.MULTI_PLATFORM)
    || hasPremiumSubscription(campaign);
}

export function hasCampaignCrm(campaign) {
  return hasPremiumFeature(campaign, PREMIUM_FEATURE_IDS.CAMPAIGN_CRM)
    || hasPremiumSubscription(campaign);
}

export function hasVerifiedBadgePremium(campaign) {
  return hasPremiumFeature(campaign, PREMIUM_FEATURE_IDS.VERIFIED_BADGE)
    || hasPremiumSubscription(campaign);
}

/** Public supporter/donate blocks on campaign pages — always on */
export function canUsePublicMobilization() {
  return true;
}

export function isFreePackage(campaign) {
  return campaign?.packageType === 'free' || campaign?.packagePrice === 0;
}

export function canViewBasicAnalytics() {
  return true;
}

export function canViewAdvancedAnalytics(campaign) {
  return hasAdvancedAnalytics(campaign);
}

/** Premium: full AI on dashboard & tone variants */
export function canUseFullAi(campaign) {
  return hasAiAssistant(campaign);
}

/** Upload only: one basic caption helper */
export function canUseBasicAiCaption() {
  return true;
}

export function canAccessDistribution(campaign) {
  return hasMultiPlatform(campaign);
}

export function canAccessCrm(campaign) {
  return hasCampaignCrm(campaign);
}

export function canUseDashboardAi(campaign) {
  return canUseFullAi(campaign);
}

/** Tab → required access check */
export const WORKSPACE_TAB_ACCESS = {
  overview: () => true,
  analytics: () => true,
  distribute: canAccessDistribution,
  supporters: canAccessCrm,
  donations: canAccessCrm,
  volunteers: canAccessCrm,
  events: canAccessCrm,
  broadcast: canAccessCrm,
};

export function canAccessWorkspaceTab(campaign, tabId) {
  const check = WORKSPACE_TAB_ACCESS[tabId];
  return check ? check(campaign) : true;
}

export function isPremiumWorkspaceTab(tabId) {
  return tabId !== 'overview' && tabId !== 'analytics';
}
