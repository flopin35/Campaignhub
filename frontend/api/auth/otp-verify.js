import {
  getFirebaseAdmin,
  hashOtp,
  normalizeEmail,
  emailDocId,
  getOtpSecret,
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

    const secret = getOtpSecret();
    const ref = admin.db.collection('auth_otp').doc(emailDocId(email));

    // Check and count every attempt inside one transaction, so parallel guesses are serialised
    // and the 5-attempt limit really holds.
    const outcome = await admin.db.runTransaction(async (t) => {
      const snap = await t.get(ref);
      if (!snap.exists) return { status: 400, message: 'No code found. Request a new one.' };
      const data = snap.data();
      if (data.expiresAt < Date.now()) {
        t.delete(ref);
        return { status: 400, message: 'Code expired. Request a new one.' };
      }
      const attempts = data.attempts || 0;
      if (attempts >= 5) {
        t.delete(ref);
        return { status: 429, message: 'Too many attempts. Request a new code.' };
      }
      const expected = hashOtp(code, data.salt, secret);
      if (expected !== data.codeHash) {
        t.update(ref, { attempts: attempts + 1 });
        return { status: 400, message: 'Invalid code. Please try again.' };
      }
      t.delete(ref);
      return { status: 200 };
    });

    if (outcome.status !== 200) {
      return json(res, outcome.status, { success: false, message: outcome.message });
    }

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
      message: 'Verification failed. Please try again.',
    });
  }
}
