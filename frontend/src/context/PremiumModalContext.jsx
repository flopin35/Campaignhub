import { createContext, useContext, useState, useCallback } from 'react';
import { PREMIUM_FEATURE_IDS } from '../data/premiumPackages';
import PremiumUpgradeModal from '../components/PremiumUpgradeModal';
import AdBoostModal from '../components/AdBoostModal';

const PremiumModalContext = createContext(null);

export function PremiumModalProvider({ children }) {
  const [premiumModal, setPremiumModal] = useState({
    open: false,
    planId: null,
    variantId: null,
    campaign: null,
    campaignId: null,
  });

  const [boostModal, setBoostModal] = useState({
    open: false,
    campaign: null,
    campaignId: null,
    variantId: null,
  });

  const openPremiumModal = useCallback(({ planId = null, variantId = null, campaign = null, campaignId = null } = {}) => {
    if (planId === PREMIUM_FEATURE_IDS.VISIBILITY_BOOST) {
      setBoostModal({
        open: true,
        campaign: campaign || null,
        campaignId: campaign?.id || campaignId || null,
        variantId: variantId || null,
      });
      return;
    }
    setPremiumModal({
      open: true,
      planId,
      variantId,
      campaign: campaign || null,
      campaignId: campaign?.id || campaignId || null,
    });
  }, []);

  const closePremiumModal = useCallback(() => {
    setPremiumModal({
      open: false,
      planId: null,
      variantId: null,
      campaign: null,
      campaignId: null,
    });
  }, []);

  const openAdBoostModal = useCallback(({ campaign = null, campaignId = null, variantId = null } = {}) => {
    setBoostModal({
      open: true,
      campaign: campaign || null,
      campaignId: campaign?.id || campaignId || null,
      variantId: variantId || null,
    });
  }, []);

  const closeAdBoostModal = useCallback(() => {
    setBoostModal({
      open: false,
      campaign: null,
      campaignId: null,
      variantId: null,
    });
  }, []);

  return (
    <PremiumModalContext.Provider value={{ openPremiumModal, closePremiumModal, openAdBoostModal, closeAdBoostModal }}>
      {children}
      <PremiumUpgradeModal
        isOpen={premiumModal.open}
        planId={premiumModal.planId}
        variantId={premiumModal.variantId}
        presetCampaign={premiumModal.campaign}
        presetCampaignId={premiumModal.campaignId}
        onClose={closePremiumModal}
      />
      <AdBoostModal
        isOpen={boostModal.open}
        presetCampaign={boostModal.campaign}
        presetCampaignId={boostModal.campaignId}
        initialVariantId={boostModal.variantId}
        onClose={closeAdBoostModal}
      />
    </PremiumModalContext.Provider>
  );
}

export function usePremiumModal() {
  const ctx = useContext(PremiumModalContext);
  if (!ctx) {
    throw new Error('usePremiumModal must be used within PremiumModalProvider');
  }
  return ctx;
}
