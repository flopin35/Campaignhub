import { useEffect, useState } from 'react';
import { subscribeCampaignAnalytics } from '../services/analyticsService';

export function useCampaignAnalytics(campaignId) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!campaignId) return;
    const unsub = subscribeCampaignAnalytics(campaignId, (data) => {
      setStats(data);
      setLoading(false);
    });
    return unsub;
  }, [campaignId]);

  return { stats, loading };
}
