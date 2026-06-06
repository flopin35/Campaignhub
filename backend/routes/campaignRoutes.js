import { Router } from 'express';
import {
  listCampaigns,
  getCampaign,
  submitCampaign,
  searchCampaigns,
  getFeaturedCampaigns,
} from '../controllers/campaignController.js';
import { optionalAuth } from '../middleware/authMiddleware.js';
import { uploadSingle } from '../middleware/uploadMiddleware.js';

const router = Router();

router.get('/', optionalAuth, listCampaigns);
router.get('/featured', getFeaturedCampaigns);
router.get('/search', searchCampaigns);
router.get('/:slug', optionalAuth, getCampaign);
router.post('/', uploadSingle, submitCampaign);

export default router;
