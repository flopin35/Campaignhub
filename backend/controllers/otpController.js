import { sendOtpHandler, verifyOtpHandler, normalizeEmail } from '../services/otpService.js';

function handleError(res, err) {
  const status = err.status || 500;
  return res.status(status).json({
    success: false,
    message: err.message,
    code: err.code,
    cooldownSeconds: err.cooldownSeconds,
  });
}

export async function sendOtp(req, res) {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
    }
    const data = await sendOtpHandler(email);
    return res.json({ success: true, ...data });
  } catch (err) {
    return handleError(res, err);
  }
}

export async function verifyOtp(req, res) {
  try {
    const email = normalizeEmail(req.body?.email);
    const code = String(req.body?.code || '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
    }
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ success: false, message: 'Enter the 6-digit code from your email.' });
    }
    const data = await verifyOtpHandler(email, code);
    return res.json({ success: true, ...data });
  } catch (err) {
    return handleError(res, err);
  }
}
