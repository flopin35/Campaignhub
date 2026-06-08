import {
  getFirebaseAdmin,
  generateOtpCode,
  hashOtp,
  normalizeEmail,
  emailDocId,
  sendOtpEmail,
} from '../_lib/otpHelpers.js';

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_SENDS_PER_HOUR = 5;
const MAX_VERIFY_ATTEMPTS = 5;

function json(res, status, body) {
  res.status(status).json(body);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { success: false, message: 'Method not allowed' });

  try {
    const email = normalizeEmail(req.body?.email);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json(res, 400, { success: false, message: 'Enter a valid email address.' });
    }

    const admin = await getFirebaseAdmin();
    if (!admin) {
      return json(res, 503, {
        success: false,
        message: 'OTP service unavailable. Use Google sign-in or contact support.',
      });
    }

    const secret = process.env.OTP_SECRET || process.env.JWT_SECRET || 'campaignhub-otp-secret';
    const docId = emailDocId(email);
    const ref = admin.db.collection('auth_otp').doc(docId);
    const snap = await ref.get();
    const now = Date.now();

    if (snap.exists) {
      const data = snap.data();
      if (data.lastSentAt && now - data.lastSentAt < RESEND_COOLDOWN_MS) {
        const wait = Math.ceil((RESEND_COOLDOWN_MS - (now - data.lastSentAt)) / 1000);
        return json(res, 429, {
          success: false,
          message: `Please wait ${wait}s before requesting another code.`,
          cooldownSeconds: wait,
        });
      }
      if (data.hourWindowStart && now - data.hourWindowStart < 3600000) {
        if ((data.sendCount || 0) >= MAX_SENDS_PER_HOUR) {
          return json(res, 429, {
            success: false,
            message: 'Too many codes sent. Try again in an hour or use Google sign-in.',
          });
        }
      }
    }

    const code = generateOtpCode();
    const salt = randomUUID();
    const codeHash = hashOtp(code, salt, secret);
    const hourWindowStart =
      snap.exists && snap.data().hourWindowStart && now - snap.data().hourWindowStart < 3600000
        ? snap.data().hourWindowStart
        : now;
    const sendCount =
      snap.exists && snap.data().hourWindowStart === hourWindowStart
        ? (snap.data().sendCount || 0) + 1
        : 1;

    await ref.set({
      email,
      codeHash,
      salt,
      expiresAt: now + OTP_EXPIRY_MS,
      attempts: 0,
      lastSentAt: now,
      hourWindowStart,
      sendCount,
    });

    await sendOtpEmail(email, code);

    return json(res, 200, {
      success: true,
      message: 'Verification code sent.',
      expiresIn: OTP_EXPIRY_MS / 1000,
      cooldownSeconds: RESEND_COOLDOWN_MS / 1000,
    });
  } catch (err) {
    console.error('[OTP] send error:', err.message);
    return json(res, 500, {
      success: false,
      message: err.message || 'Could not send verification code.',
    });
  }
}
