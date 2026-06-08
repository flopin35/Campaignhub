import {
  getFirebaseAdmin,
  hashOtp,
  normalizeEmail,
  emailDocId,
} from '../_lib/otpHelpers.js';

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
    const code = String(req.body?.code || '').trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json(res, 400, { success: false, message: 'Enter a valid email address.' });
    }
    if (!/^\d{6}$/.test(code)) {
      return json(res, 400, { success: false, message: 'Enter the 6-digit code from your email.' });
    }

    const admin = await getFirebaseAdmin();
    if (!admin) {
      return json(res, 503, {
        success: false,
        message: 'OTP service unavailable. Use Google sign-in.',
      });
    }

    const secret = process.env.OTP_SECRET || process.env.JWT_SECRET || 'campaignhub-otp-secret';
    const ref = admin.db.collection('auth_otp').doc(emailDocId(email));
    const snap = await ref.get();

    if (!snap.exists) {
      return json(res, 400, { success: false, message: 'No code found. Request a new one.' });
    }

    const data = snap.data();
    const now = Date.now();

    if (data.expiresAt < now) {
      await ref.delete();
      return json(res, 400, { success: false, message: 'Code expired. Request a new one.' });
    }

    if ((data.attempts || 0) >= 5) {
      await ref.delete();
      return json(res, 429, { success: false, message: 'Too many attempts. Request a new code.' });
    }

    const expected = hashOtp(code, data.salt, secret);
    if (expected !== data.codeHash) {
      await ref.update({ attempts: (data.attempts || 0) + 1 });
      return json(res, 400, { success: false, message: 'Invalid code. Please try again.' });
    }

    await ref.delete();

    let userRecord;
    try {
      userRecord = await admin.auth.getUserByEmail(email);
    } catch {
      userRecord = await admin.auth.createUser({
        email,
        emailVerified: true,
      });
    }

    if (!userRecord.emailVerified) {
      await admin.auth.updateUser(userRecord.uid, { emailVerified: true });
    }

    const customToken = await admin.auth.createCustomToken(userRecord.uid);

    return json(res, 200, {
      success: true,
      customToken,
      isNewUser: !userRecord.metadata.lastSignInTime,
    });
  } catch (err) {
    console.error('[OTP] verify error:', err.message);
    return json(res, 500, {
      success: false,
      message: err.message || 'Verification failed. Please try again.',
    });
  }
}
