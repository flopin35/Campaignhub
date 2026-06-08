import { createHash, randomInt, randomUUID } from 'crypto';

let adminApp = null;

function getPrivateKey() {
  const raw = process.env.FIREBASE_PRIVATE_KEY || '';
  return raw.replace(/\\n/g, '\n');
}

export async function getFirebaseAdmin() {
  if (adminApp) return adminApp;

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  const { initializeApp, cert, getApps } = await import('firebase-admin/app');
  const { getAuth } = await import('firebase-admin/auth');
  const { getFirestore } = await import('firebase-admin/firestore');

  if (getApps().length === 0) {
    adminApp = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  } else {
    adminApp = getApps()[0];
  }

  return {
    auth: getAuth(adminApp),
    db: getFirestore(adminApp),
  };
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

export async function sendOtpEmail(to, code) {
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.OTP_EMAIL_FROM || 'CampaignHub <onboarding@campaignhubgh.com>';

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#6366f1;">CampaignHub</h2>
      <p>Your secure login code:</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#111;">${code}</p>
      <p style="color:#666;font-size:14px;">Expires in 5 minutes. Never share this code.</p>
      <p style="color:#999;font-size:12px;">Protected by Firebase Security</p>
    </div>
  `;

  if (resendKey) {
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
        html,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Email delivery failed: ${err}`);
    }
    return;
  }

  if (process.env.NODE_ENV !== 'production' && process.env.OTP_DEV_LOG === 'true') {
    console.info('[OTP] Dev code for', to, ':', code);
    return;
  }

  throw new Error('OTP email is not configured. Set RESEND_API_KEY on the server.');
}
