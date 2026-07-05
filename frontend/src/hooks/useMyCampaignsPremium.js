import { useEffect, useState, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/auth';
import { useAuth } from '../context/AuthContext';
import { normalizeCampaign } from '../utils/campaignHelpers';
import { hasPremiumSubscription } from '../utils/featureAccess';

/** Live premium status across all campaigns owned by the signed-in user. */
export function useMyCampaignsPremium() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setCampaigns([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const q = query(collection(db, 'campaigns'), where('ownerId', '==', user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCampaigns(snap.docs.map(normalizeCampaign));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, [user?.uid]);

  const premiumCampaigns = useMemo(
    () => campaigns.filter(hasPremiumSubscription),
    [campaigns]
  );

  return {
    campaigns,
    premiumCampaigns,
    hasAnyPremium: premiumCampaigns.length > 0,
    primaryPremiumCampaign: premiumCampaigns[0] || null,
    loading,
  };
}
