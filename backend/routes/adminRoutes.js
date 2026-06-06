import { Router } from 'express';
import {
  getDashboardStats,
  getAllCampaignsAdmin,
  approveCampaign,
  rejectCampaign,
  extendCampaign,
  removeCampaign,
  confirmPayment,
} from '../controllers/adminController.js';
import { requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.use(requireAdmin);

router.get('/stats', getDashboardStats);
router.get('/campaigns', getAllCampaignsAdmin);
router.post('/campaigns/:id/approve', approveCampaign);
router.post('/campaigns/:id/reject', rejectCampaign);
router.post('/campaigns/:id/extend', extendCampaign);
router.post('/campaigns/:id/confirm-payment', confirmPayment);
router.delete('/campaigns/:id', removeCampaign);

export default router;
