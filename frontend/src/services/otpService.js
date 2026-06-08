import api from './api';
import { signInWithOtpCustomToken, sanitizeEmail } from './authService';
import { authLog } from '../utils/authLogger';

export const otpService = {
  sendCode: async (email) => {
    const normalized = sanitizeEmail(email);
    authLog.otp('Requesting OTP', normalized);
    const res = await api.post('/auth/otp-send', { email: normalized });
    return res.data;
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
