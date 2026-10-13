# Files no longer used after the redesign

The redesign replaced these files. Nothing imports them any more, so they do not
affect `npm run build`. They were left in place so nothing is lost; delete them
from `frontend/src/` whenever you like (they stay in your git history).

## components/
AIChatWidget.jsx, AIUploadHelper.jsx, AdBoostModal.jsx, AdBoostPricing.jsx,
AnalyticsDashboard.jsx, AnalyticsWidget.jsx, AuthTrustBadge.jsx, BoostBadge.jsx,
BoostedHero.jsx, CampaignCountdown.jsx, CampaignMobilization.jsx,
CampaignSkeleton.jsx, CampaignStats.jsx, CampaignWorkspace.jsx,
CommentsSection.jsx, CopyLinkButton.jsx, DonateModal.jsx, EmptyState.jsx,
ExtendCampaignModal.jsx, FeatureSection.jsx, FeaturedBanner.jsx,
FollowButton.jsx, Footer.jsx, HeroSection.jsx, HowItWorks.jsx,
ImageDropzone.jsx, MobileNav.jsx, MultiPlatformDistribution.jsx, Navbar.jsx,
NotificationBell.jsx (moved to components/layout/), PackageSelector.jsx,
PaymentProofUpload.jsx, PaymentScreen.jsx, PremiumActiveBadge.jsx,
PremiumFeaturesSection.jsx, PremiumGate.jsx, PremiumPackageCard.jsx,
PremiumUpgradeModal.jsx, PremiumUpgradePanel.jsx, ProtectedRoute.jsx,
QRCodeCard.jsx, QuickShareModal.jsx, ReportButton.jsx, ShareButtons.jsx,
ShareCampaignSection.jsx, Sidebar.jsx, SpotlightCarousel.jsx,
SupporterSignupModal.jsx, TrustPaymentBlock.jsx, TrustSection.jsx,
UpgradePrompt.jsx, UploadForm.jsx, UploadProgressBar.jsx,
VerificationBadge.jsx, WhyUpgradeSection.jsx, admin/AdminPanels.jsx,
icons/AppIcons.jsx

## context/
DashboardCampaignContext.jsx, PremiumModalContext.jsx

## data/
brand.js, campaignTemplates.js, extensionPackages.js

## hooks/
useCampaignAnalytics.js, useMyCampaignsPremium.js, useViralCampaigns.js

## pages/
CampaignCommandCenter.jsx, CampaignPerformance.jsx

## services/
broadcastService.js, campaignService.js, commentService.js,
extensionService.js, followService.js, premiumService.js

## utils/
contentQuality.js, featureAccess.js, helpers.js
