/** Shared OTP settings — keep send + verify in sync. */

export const OTP_EXPIRY_MS = 5 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_SENDS_PER_HOUR = 5;
export const MAX_VERIFY_ATTEMPTS = 5;

export const OTP_FALLBACK_SECRET = 'campaignhub-otp-secret-change-me';

export function getOtpSecret() {
  return process.env.OTP_SECRET || process.env.JWT_SECRET || OTP_FALLBACK_SECRET;
}

export const DEFAULT_SMTP_USER = 'campaignhubgh@gmail.com';

export function getSmtpCredentials() {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER || DEFAULT_SMTP_USER;
  const pass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '').replace(/\s/g, '');
  return pass ? { user, pass } : null;
}

export function getResendApiKey() {
  const key = (process.env.RESEND_API_KEY || '').trim();
  if (!key || !key.startsWith('re_') || key.includes('your_') || key === 're_') return null;
  return key;
}
