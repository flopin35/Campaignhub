import { PRO_PLANS, TRIAL_DAYS, GRACE_DAYS, formatCedis } from '../../api/_lib/billingCatalog.js';

export { PRO_PLANS, TRIAL_DAYS, GRACE_DAYS, formatCedis };

const DAY = 86400000;

export function toMs(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value === 'string') return new Date(value).getTime() || 0;
  if (value.seconds) return value.seconds * 1000;
  return 0;
}

function daysUntil(ms, now) {
  return Math.max(0, Math.ceil((ms - now) / DAY));
}

/**
 * Single place that decides what a campaign page is entitled to.
 * Mirrors campaignHasPro() in api/_lib/billing.js and isProCampaign() in firestore.rules.
 */
export function getBillingState(campaign, now = Date.now()) {
  if (!campaign) return { state: 'unknown', isPro: false, label: '—', tone: 'neutral' };
  const sub = campaign.subscription || null;
  const periodEnd = toMs(sub?.currentPeriodEnd);
  const isTrialPkg = campaign.packageType === 'trial';
  const trialEnd = isTrialPkg ? toMs(campaign.trialEndsAt) : 0;
  const publicUntil = toMs(campaign.endDate);
  const legacyEnd = toMs(campaign.premiumFeatures?.['campaign-crm']?.expiresAt);

  if (periodEnd > now) {
    return {
      state: 'active',
      isPro: true,
      label: 'Pro',
      tone: 'success',
      cycle: sub.cycle,
      autoRenew: !!sub.autoRenew,
      provider: sub.provider,
      endsAt: periodEnd,
      daysLeft: daysUntil(periodEnd, now),
      renewSoon: periodEnd - now < 5 * DAY,
    };
  }
  if (trialEnd > now) {
    return {
      state: 'trialing',
      isPro: true,
      label: 'Free trial',
      tone: 'gold',
      endsAt: trialEnd,
      daysLeft: daysUntil(trialEnd, now),
      renewSoon: true,
    };
  }
  if (legacyEnd > now) {
    return {
      state: 'active',
      legacy: true,
      isPro: true,
      label: 'Pro',
      tone: 'success',
      endsAt: legacyEnd,
      daysLeft: daysUntil(legacyEnd, now),
      renewSoon: legacyEnd - now < 5 * DAY,
    };
  }
  if ((periodEnd || trialEnd) && publicUntil > now) {
    return {
      state: 'grace',
      isPro: false,
      label: 'Payment due',
      tone: 'warning',
      endsAt: publicUntil,
      daysLeft: daysUntil(publicUntil, now),
      wasTrial: !periodEnd,
    };
  }
  if (periodEnd) {
    return { state: 'expired', isPro: false, label: 'Expired', tone: 'danger', endedAt: periodEnd };
  }
  if (isTrialPkg) {
    return { state: 'trial_ended', isPro: false, label: 'Trial ended', tone: 'danger', endedAt: trialEnd };
  }
  if (campaign.status === 'payment_pending') {
    return { state: 'unpaid', isPro: false, label: 'Not activated', tone: 'neutral' };
  }
  return { state: 'inactive', isPro: false, label: 'No plan', tone: 'neutral' };
}

export function isPro(campaign) {
  return getBillingState(campaign).isPro;
}

/** Whether this account can still start its one free trial (and, if given, on this page). */
export function canStartTrial(userProfile, campaign) {
  if (userProfile?.trialCampaignId) return false;
  if (campaign && (campaign.disabled || ['suspended', 'rejected', 'deleted', 'disabled'].includes(campaign.status))) return false;
  return true;
}

export function describeBilling(b) {
  switch (b.state) {
    case 'active':
      return b.autoRenew
        ? `Renews automatically in ${b.daysLeft} day${b.daysLeft === 1 ? '' : 's'}`
        : `Paid through ${formatDay(b.endsAt)} · ${b.daysLeft} day${b.daysLeft === 1 ? '' : 's'} left`;
    case 'trialing':
      return `Free trial · ${b.daysLeft} day${b.daysLeft === 1 ? '' : 's'} left`;
    case 'grace':
      return `Tools paused — public page stays up ${b.daysLeft} more day${b.daysLeft === 1 ? '' : 's'}`;
    case 'expired':
      return 'Subscription ended — renew to restore your tools and public page';
    case 'trial_ended':
      return 'Free trial ended — subscribe to keep campaigning';
    case 'unpaid':
      return 'Subscribe to publish this campaign page and unlock every tool';
    default:
      return 'Start your plan to unlock every campaign tool';
  }
}

export function formatDay(ms) {
  if (!ms) return '—';
  return new Date(ms).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const PRO_FEATURES = [
  { title: 'Voter CRM', text: 'Every supporter by region, constituency and polling station — with support levels, tags, import & export.' },
  { title: 'Path-to-victory projection', text: 'Live projected votes vs. your win number, by polling station.' },
  { title: 'Field team links', text: 'Canvassers log door-to-door contacts from any phone — no app or login needed.' },
  { title: 'Election-day results', text: 'Polling agents submit pink-sheet figures; you watch the collation live.' },
  { title: 'Ads manager & ROI', text: 'Tracked links and QR codes per ad, radio spot and poster — cost per supporter, not guesswork.' },
  { title: 'Message centre', text: 'Targeted WhatsApp, SMS and email broadcasts with templates and bulk-SMS export.' },
  { title: 'AI speechwriter', text: 'Speeches, ad copy, posts and rebuttals in English, Twi, Ga, Ewe, Hausa and more.' },
  { title: 'Events & fundraising', text: 'Rallies with RSVPs, MoMo donations, donor lists and goals.' },
  { title: 'Issue polls & insights', text: 'Ask voters what matters, see answers by region, track every page visit by source.' },
  { title: 'Official campaign page', text: 'A fast, mobile-first page with your manifesto, QR code, sign-ups and Spotlight placement.' },
];
