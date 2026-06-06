import { Router } from 'express';
import { login, verifyToken } from '../controllers/authController.js';
import { requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/login', login);
router.get('/verify', requireAdmin, verifyToken);

export default router;
