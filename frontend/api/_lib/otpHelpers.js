import { createHash, randomInt, randomUUID } from 'crypto';

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

function buildOtpEmailHtml(code) {
  return `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0f0f12;color:#f4f4f5;border-radius:16px;">
      <div style="width:48px;height:48px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:bold;color:white;margin-bottom:20px;">CH</div>
      <h2 style="margin:0 0 8px;font-size:20px;">Your CampaignHub login code</h2>
      <p style="color:#a1a1aa;font-size:14px;margin:0 0 24px;">Enter this code to sign in. Expires in 5 minutes.</p>
      <p style="font-size:36px;font-weight:700;letter-spacing:10px;color:#fff;margin:0 0 24px;text-align:center;">${code}</p>
      <p style="color:#71717a;font-size:12px;margin:0;">Never share this code. Protected by Firebase Security.</p>
    </div>
  `;
}

async function sendViaResend(to, code) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return false;

  const from =
    process.env.OTP_EMAIL_FROM || 'CampaignHub <onboarding@resend.dev>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `${code} is your CampaignHub login code`,
      html: buildOtpEmailHtml(code),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend failed: ${err}`);
  }
  return true;
}

async function sendViaSmtp(to, code) {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) return false;

  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: process.env.OTP_EMAIL_FROM || `CampaignHub <${user}>`,
    to,
    subject: `${code} is your CampaignHub login code`,
    html: buildOtpEmailHtml(code),
  });
  return true;
}

export async function sendOtpEmail(to, code) {
  if (await sendViaResend(to, code)) return;
  if (await sendViaSmtp(to, code)) return;

  if (process.env.OTP_DEV_LOG === 'true' || process.env.VERCEL_ENV === 'development') {
    console.info('[OTP] Dev code for', to, ':', code);
    return;
  }

  throw new Error(
    'Email not configured. Add RESEND_API_KEY or Gmail SMTP (SMTP_USER + SMTP_PASS) on the server. For Gmail use an App Password, not your normal password.'
  );
}

export { randomUUID };
