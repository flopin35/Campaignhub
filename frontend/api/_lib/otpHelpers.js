import { createHash, randomInt, randomUUID } from 'crypto';
import {
  getOtpSecret,
  getSmtpCredentials,
  getResendApiKey,
  DEFAULT_SMTP_USER,
} from './otpConfig.js';

let adminCache = null;

function parsePrivateKey(raw = '') {
  return raw.replace(/\\n/g, '\n').trim();
}

function loadServiceAccountFromEnv() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!json) return null;
  try {
    const sa = JSON.parse(json);
    return {
      projectId: sa.project_id,
      clientEmail: sa.client_email,
      privateKey: sa.private_key,
    };
  } catch {
    console.error('[OTP] FIREBASE_SERVICE_ACCOUNT is not valid JSON');
    return null;
  }
}

export async function getFirebaseAdmin() {
  if (adminCache) return adminCache;

  const fromJson = loadServiceAccountFromEnv();
  const projectId =
    fromJson?.projectId ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    'new1-e94db';
  const clientEmail = fromJson?.clientEmail || process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = parsePrivateKey(fromJson?.privateKey || process.env.FIREBASE_PRIVATE_KEY);

  if (!clientEmail || !privateKey) {
    console.error('[OTP] Firebase Admin missing clientEmail or privateKey');
    return null;
  }

  const { initializeApp, cert, getApps } = await import('firebase-admin/app');
  const { getAuth } = await import('firebase-admin/auth');
  const { getFirestore } = await import('firebase-admin/firestore');

  const app =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
        });

  adminCache = { auth: getAuth(app), db: getFirestore(app) };
  return adminCache;
}

export function hashOtp(code, salt, secret) {
  return createHash('sha256').update(`${code}:${salt}:${secret}`).digest('hex');
}

export function generateOtpCode() {
  return String(randomInt(100000, 999999));
}

export function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

export function emailDocId(email) {
  return createHash('sha256').update(normalizeEmail(email)).digest('hex');
}

const OTP_EMAIL_SUBJECT = 'Your CampaignHub verification code';

function buildOtpEmailContent(code) {
  const year = new Date().getFullYear();
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:28px 32px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="vertical-align:middle;">
                  <div style="display:inline-block;width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:10px;text-align:center;line-height:40px;font-weight:700;color:#fff;font-size:16px;">CH</div>
                </td>
                <td style="padding-left:14px;vertical-align:middle;">
                  <p style="margin:0;font-size:18px;font-weight:600;color:#ffffff;letter-spacing:-0.02em;">CampaignHub</p>
                  <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.85);">Ghana's campaign platform</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px 28px;">
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:600;color:#18181b;letter-spacing:-0.02em;">Your verification code</h1>
            <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#52525b;">
              Use the code below to sign in to your CampaignHub account. For your security, this code expires in <strong>5 minutes</strong>.
            </p>
            <div style="background:#f4f4f5;border:1px solid #e4e4e7;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
              <p style="margin:0 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#71717a;">Verification code</p>
              <p style="margin:0;font-size:40px;font-weight:700;letter-spacing:12px;color:#4f46e5;font-family:'Courier New',Courier,monospace;">${code}</p>
            </div>
            <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#71717a;">
              If you didn't request this code, you can safely ignore this email. Someone may have entered your email address by mistake.
            </p>
            <p style="margin:0;font-size:13px;line-height:1.6;color:#71717a;">
              Need help? Contact us at <a href="mailto:campaignhubgh@gmail.com" style="color:#4f46e5;text-decoration:none;">campaignhubgh@gmail.com</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;background:#fafafa;border-top:1px solid #e4e4e7;">
            <p style="margin:0;font-size:11px;line-height:1.5;color:#a1a1aa;text-align:center;">
              © ${year} CampaignHub · <a href="https://www.campaignhubgh.com" style="color:#71717a;text-decoration:none;">campaignhubgh.com</a><br>
              Never share this code with anyone — CampaignHub staff will never ask for it.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const text = [
    'CampaignHub — Your verification code',
    '',
    `Your code: ${code}`,
    '',
    'This code expires in 5 minutes.',
    '',
    "If you didn't request this, ignore this email.",
    'Support: campaignhubgh@gmail.com',
    'https://www.campaignhubgh.com',
  ].join('\n');

  return { html, text, subject: OTP_EMAIL_SUBJECT };
}

async function sendViaResend(to, code) {
  const resendKey = getResendApiKey();
  if (!resendKey) return false;

  const from =
    process.env.OTP_EMAIL_FROM || 'CampaignHub <onboarding@resend.dev>';
  const { html, text, subject } = buildOtpEmailContent(code);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        text,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[OTP] Resend failed:', err);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[OTP] Resend error:', err.message);
    return false;
  }
}

async function sendViaSmtp(to, code) {
  const creds = getSmtpCredentials();
  if (!creds) return false;

  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: creds.user, pass: creds.pass },
  });

  const { html, text, subject } = buildOtpEmailContent(code);

  try {
    await transporter.sendMail({
      from: process.env.OTP_EMAIL_FROM || `CampaignHub <${creds.user || DEFAULT_SMTP_USER}>`,
      to,
      subject,
      html,
      text,
    });
    return true;
  } catch (err) {
    console.error('[OTP] SMTP failed:', err.message);
    throw new Error(
      `Could not send email via Gmail (${creds.user}). Check SMTP_PASS or GMAIL_APP_PASSWORD on the server.`
    );
  }
}

function isLocalDevOtpLog() {
  // Never pretend emails were sent on Vercel — only log codes during local dev.
  return process.env.OTP_DEV_LOG === 'true' && !process.env.VERCEL;
}

export async function sendOtpEmail(to, code) {
  const errors = [];

  try {
    if (await sendViaSmtp(to, code)) return 'smtp';
  } catch (err) {
    errors.push(err.message);
  }

  if (await sendViaResend(to, code)) return 'resend';

  if (isLocalDevOtpLog()) {
    console.info('[OTP] Dev code for', to, ':', code);
    return 'dev';
  }

  const hint = getSmtpCredentials()
    ? errors[0]
    : 'Add Gmail SMTP (SMTP_PASS or GMAIL_APP_PASSWORD) or a valid RESEND_API_KEY on Vercel.';

  throw new Error(
    errors[0] ||
      `Email delivery is not configured on the server. ${hint} You can also use Password or Google sign-in.`
  );
}

export { randomUUID, getOtpSecret };
