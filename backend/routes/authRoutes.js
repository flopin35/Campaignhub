import { Router } from 'express';
import { login, verifyToken } from '../controllers/authController.js';
import { sendOtp, verifyOtp } from '../controllers/otpController.js';
import { requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/login', login);
router.get('/verify', requireAdmin, verifyToken);

/** Passwordless email OTP */
router.post('/otp-send', sendOtp);
router.post('/otp-verify', verifyOtp);

export default router;
