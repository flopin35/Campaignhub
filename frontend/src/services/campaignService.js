export {
  createCampaign,
  getCampaignBySlug,
  fetchCampaigns,
  approveCampaign,
  rejectCampaign,
  deleteCampaign,
  extendCampaign,
  toggleFeatured,
  toggleSpotlight,
  getCampaignStats,
  getUserCampaigns,
} from './campaignFirestoreService';

export {
  createPayment,
  submitPaymentProof,
  verifyPaymentAndActivate,
  rejectPayment,
  getPaymentByCampaign,
  getUserPayments,
} from './paymentService';

export {
  trackView,
  trackVisit,
  trackShare,
  trackClick,
  trackLinkCopy,
  trackPlatformShare,
  trackQrScan,
  getCampaignAnalytics,
  subscribeCampaignAnalytics,
  getViralScore,
  getShareScore,
} from './analyticsService';
