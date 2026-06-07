import { PREMIUM_FEATURE_IDS } from '../data/premiumPackages';

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

export function hasAdvancedAnalytics(campaign) {
  return hasPremiumFeature(campaign, PREMIUM_FEATURE_IDS.ADVANCED_ANALYTICS);
}

export function hasAiAssistant(campaign) {
  return hasPremiumFeature(campaign, PREMIUM_FEATURE_IDS.AI_ASSISTANT);
}

export function hasMultiPlatform(campaign) {
  return hasPremiumFeature(campaign, PREMIUM_FEATURE_IDS.MULTI_PLATFORM);
}

export function hasVerifiedBadgePremium(campaign) {
  return hasPremiumFeature(campaign, PREMIUM_FEATURE_IDS.VERIFIED_BADGE) || campaign?.verified;
}

export function isFreePackage(campaign) {
  return campaign?.packageType === 'free' || campaign?.packagePrice === 0;
}

/** Basic analytics always free for campaign owners */
export function canViewBasicAnalytics() {
  return true;
}

export function canViewAdvancedAnalytics(campaign) {
  return hasAdvancedAnalytics(campaign);
}

/** Free: basic caption only. Premium: full AI assistant */
export function canUseFullAi(campaign) {
  return hasAiAssistant(campaign);
}

export function canUseBasicAiCaption() {
  return true;
}
