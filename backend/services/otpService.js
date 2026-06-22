import { createHash, randomInt, randomUUID } from 'crypto';
import admin from 'firebase-admin';
import nodemailer from 'nodemailer';
import { isFirebaseConfigured, getDb } from '../config/firebaseConfig.js';

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_SENDS_PER_HOUR = 5;
const MAX_VERIFY_ATTEMPTS = 5;

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

function otpSecret() {
  return process.env.OTP_SECRET || process.env.JWT_SECRET || 'campaignhub-otp-secret-change-me';
}

async function sendOtpEmail(to, code) {
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px;">
      <h2>CampaignHub login code</h2>
      <p style="font-size:32px;font-weight:bold;letter-spacing:8px;">${code}</p>
      <p style="color:#666;">Expires in 5 minutes.</p>
    </div>
  `;

  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.OTP_EMAIL_FROM || 'CampaignHub <onboarding@resend.dev>',
        to: [to],
        subject: `${code} is your CampaignHub login code`,
        html,
      }),
    });
    if (!res.ok) throw new Error(`Email failed: ${await res.text()}`);
    return;
  }

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: process.env.OTP_EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject: `${code} is your CampaignHub login code`,
      html,
    });
    return;
  }

  if (process.env.OTP_DEV_LOG === 'true' || process.env.NODE_ENV !== 'production') {
    console.info('[OTP] Dev code for', to, ':', code);
    return;
  }

  throw new Error('Set RESEND_API_KEY or SMTP_USER + SMTP_PASS to send OTP emails.');
}

export async function sendOtpHandler(email) {
  if (!isFirebaseConfigured()) {
    const err = new Error('OTP service unavailable. Configure Firebase Admin in backend/.env');
    err.status = 503;
    err.code = 'OTP_ADMIN_MISSING';
    throw err;
  }

  const db = getDb();
  const docId = emailDocId(email);
  const ref = db.collection('auth_otp').doc(docId);
  const snap = await ref.get();
  const now = Date.now();

  if (snap.exists) {
    const data = snap.data();
    if (data.lastSentAt && now - data.lastSentAt < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - (now - data.lastSentAt)) / 1000);
      const err = new Error(`Please wait ${wait}s before requesting another code.`);
      err.status = 429;
      err.cooldownSeconds = wait;
      throw err;
    }
    if (data.hourWindowStart && now - data.hourWindowStart < 3600000 && (data.sendCount || 0) >= MAX_SENDS_PER_HOUR) {
      const err = new Error('Too many codes sent. Try again in an hour.');
      err.status = 429;
      throw err;
    }
  }

  const code = generateOtpCode();
  const salt = randomUUID();
  const hourWindowStart =
    snap.exists && snap.data().hourWindowStart && now - snap.data().hourWindowStart < 3600000
      ? snap.data().hourWindowStart
      : now;

  await ref.set({
    email,
    codeHash: hashOtp(code, salt, otpSecret()),
    salt,
    expiresAt: now + OTP_EXPIRY_MS,
    attempts: 0,
    lastSentAt: now,
    hourWindowStart,
    sendCount:
      snap.exists && snap.data().hourWindowStart === hourWindowStart
        ? (snap.data().sendCount || 0) + 1
        : 1,
  });

  await sendOtpEmail(email, code);

  return {
    message: 'Verification code sent. Check your inbox.',
    expiresIn: OTP_EXPIRY_MS / 1000,
    cooldownSeconds: RESEND_COOLDOWN_MS / 1000,
  };
}

export async function verifyOtpHandler(email, code) {
  if (!isFirebaseConfigured()) {
    const err = new Error('OTP service unavailable.');
    err.status = 503;
    throw err;
  }

  const db = getDb();
  const ref = db.collection('auth_otp').doc(emailDocId(email));
  const snap = await ref.get();

  if (!snap.exists) {
    const err = new Error('No code found. Request a new one.');
    err.status = 400;
    throw err;
  }

  const data = snap.data();
  const now = Date.now();

  if (data.expiresAt < now) {
    await ref.delete();
    const err = new Error('Code expired. Request a new one.');
    err.status = 400;
    throw err;
  }

  if ((data.attempts || 0) >= MAX_VERIFY_ATTEMPTS) {
    await ref.delete();
    const err = new Error('Too many attempts. Request a new code.');
    err.status = 429;
    throw err;
  }

  if (hashOtp(code, data.salt, otpSecret()) !== data.codeHash) {
    await ref.update({ attempts: (data.attempts || 0) + 1 });
    const err = new Error('Invalid code. Please try again.');
    err.status = 400;
    throw err;
  }

  await ref.delete();

  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
  } catch {
    userRecord = await admin.auth().createUser({ email, emailVerified: true });
  }

  if (!userRecord.emailVerified) {
    await admin.auth().updateUser(userRecord.uid, { emailVerified: true });
  }

  const customToken = await admin.auth().createCustomToken(userRecord.uid);

  return {
    customToken,
    isNewUser: !userRecord.metadata.lastSignInTime,
  };
}
