/** Campaign content quality — profanity, length, spam protection */

const PROFANITY = [
  'fuck', 'shit', 'bitch', 'asshole', 'damn', 'cunt', 'nigger', 'faggot',
  'whore', 'slut', 'bastard', 'piss', 'cock', 'dick', 'pussy',
];

const SPAM_PATTERNS = [
  /(.)\1{6,}/i,
  /(https?:\/\/[^\s]+){4,}/i,
  /(win\s+money|get\s+rich|free\s+money|click\s+here\s+now)/i,
];

export const CONTENT_LIMITS = {
  titleMin: 5,
  titleMax: 120,
  descriptionMin: 30,
  descriptionMax: 2000,
};

export function containsProfanity(text = '') {
  const lower = text.toLowerCase();
  return PROFANITY.some((word) => {
    const re = new RegExp(`\\b${word}\\b`, 'i');
    return re.test(lower);
  });
}

export function looksLikeSpam(text = '') {
  return SPAM_PATTERNS.some((re) => re.test(text));
}

export function validateCampaignContent({ title = '', description = '' }) {
  const errors = {};
  const t = title.trim();
  const d = description.trim();

  if (t.length < CONTENT_LIMITS.titleMin) {
    errors.title = `Title must be at least ${CONTENT_LIMITS.titleMin} characters`;
  } else if (t.length > CONTENT_LIMITS.titleMax) {
    errors.title = `Title must be under ${CONTENT_LIMITS.titleMax} characters`;
  } else if (containsProfanity(t)) {
    errors.title = 'Title contains inappropriate language';
  } else if (looksLikeSpam(t)) {
    errors.title = 'Title looks like spam — please revise';
  }

  if (d.length < CONTENT_LIMITS.descriptionMin) {
    errors.description = `Description must be at least ${CONTENT_LIMITS.descriptionMin} characters`;
  } else if (d.length > CONTENT_LIMITS.descriptionMax) {
    errors.description = `Description must be under ${CONTENT_LIMITS.descriptionMax} characters`;
  } else if (containsProfanity(d)) {
    errors.description = 'Description contains inappropriate language';
  } else if (looksLikeSpam(d)) {
    errors.description = 'Description looks like spam — please revise';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function getBundleSavings(plan) {
  if (!plan?.originalPrice || plan.originalPrice <= plan.price) return 0;
  return plan.originalPrice - plan.price;
}
