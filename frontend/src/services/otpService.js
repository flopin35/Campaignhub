import api from './api';
import { signInWithOtpCustomToken, sanitizeEmail, sendEmailSignInLink } from './authService';
import { authLog } from '../utils/authLogger';

function isOtpServiceUnavailable(message = '') {
  const msg = message.toLowerCase();
  return (
    msg.includes('otp service') ||
    msg.includes('otp_admin') ||
    msg.includes('starting up') ||
    msg.includes('unavailable')
  );
}

export const otpService = {
  sendCode: async (email) => {
    const normalized = sanitizeEmail(email);
    authLog.otp('Requesting OTP', normalized);
    try {
      const res = await api.post('/auth/otp-send', { email: normalized });
      return { ...res.data, method: 'otp' };
    } catch (err) {
      if (!isOtpServiceUnavailable(err.message || '')) throw err;
      authLog.otp('OTP server unavailable — sending Firebase email link', normalized);
      await sendEmailSignInLink(normalized);
      return {
        success: true,
        method: 'link',
        message: 'Sign-in link sent. Open your email and tap the link on this device.',
        cooldownSeconds: 60,
      };
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
