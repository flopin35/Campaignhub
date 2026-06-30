import api from './api';
import { signInWithOtpCustomToken, sanitizeEmail } from './authService';
import { authLog } from '../utils/authLogger';

function isOtpServiceUnavailable(message = '', code = '') {
  const msg = message.toLowerCase();
  return (
    code === 'OTP_ADMIN_MISSING' ||
    msg.includes('otp service') ||
    msg.includes('otp_admin') ||
    msg.includes('starting up') ||
    msg.includes('unavailable')
  );
}

export const otpService = {
  sendCode: async (email) => {
    const normalized = sanitizeEmail(email);
    authLog.otp('Requesting 6-digit OTP', normalized);
    try {
      const res = await api.post('/auth/otp-send', { email: normalized });
      return { ...res.data, method: 'otp' };
    } catch (err) {
      if (!isOtpServiceUnavailable(err.message || '', err.code || '')) throw err;
      const unavailable = new Error(
        '6-digit email codes are not enabled on the server yet. Use Password or Google sign-in, or ask the admin to add Firebase credentials to Vercel.'
      );
      unavailable.code = 'OTP_UNAVAILABLE';
      throw unavailable;
    }
  },

  verifyCode: async (email, code) => {
    const normalized = sanitizeEmail(email);
    authLog.otp('Verifying OTP', normalized);
    const res = await api.post('/auth/otp-verify', { email: normalized, code });
    const payload = res.data || {};
    const customToken = payload.customToken;
    if (!customToken) throw new Error(payload.message || 'Verification failed. Please try again.');
    const result = await signInWithOtpCustomToken(customToken);
    return { ...result, isNewUser: !!payload.isNewUser };
  },
};

export default otpService;
