import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/auth';
import { useCampaigns } from './useCampaigns';
import { getViralScore, getShareScore, getGrowthScore } from '../services/analyticsService';

const ANALYTICS_POLL_MS = 90_000;

function sortCampaigns(campaigns, analyticsMap, sortBy, limit) {
  const scored = campaigns.map((c) => {
    const analytics = analyticsMap[c.id] || {};
    return {
      ...c,
      analytics,
      viralScore: getViralScore(analytics, c),
      shareScore: getShareScore(analytics),
      growthScore: getGrowthScore(analytics, c),
    };
  });

  scored.sort((a, b) => {
    switch (sortBy) {
      case 'shares':
        return b.shareScore - a.shareScore || b.viralScore - a.viralScore;
      case 'growth':
        return b.growthScore - a.growthScore || b.viralScore - a.viralScore;
      case 'views':
        return (b.analytics.totalViews ?? b.views ?? 0) - (a.analytics.totalViews ?? a.views ?? 0);
      case 'qr':
        return (b.analytics.qrScans ?? 0) - (a.analytics.qrScans ?? 0);
      case 'elite':
        return (b.priorityLevel || 0) - (a.priorityLevel || 0) || b.viralScore - a.viralScore;
      default:
        return b.viralScore - a.viralScore;
    }
  });

  return scored.slice(0, limit);
}

/**
 * Real-time campaigns ranked by analytics (viral score, shares, views, QR scans).
 */
export function useViralCampaigns({ sortBy = 'viral', limit = 6 } = {}) {
  const { campaigns, loading: campaignsLoading } = useCampaigns({ status: 'active' });
  const [analyticsMap, setAnalyticsMap] = useState({});
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timer;

    const load = async () => {
      try {
        const snap = await getDocs(collection(db, 'analytics'));
        if (cancelled) return;
        const map = {};
        snap.docs.forEach((d) => {
          map[d.id] = d.data();
        });
        setAnalyticsMap(map);
        setAnalyticsLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.warn('Analytics fetch skipped:', err.message);
        setAnalyticsLoading(false);
      }
    };

    load();
    timer = setInterval(load, ANALYTICS_POLL_MS);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, []);

  const ranked = useMemo(
    () => sortCampaigns(campaigns, analyticsMap, sortBy, limit),
    [campaigns, analyticsMap, sortBy, limit]
  );

  return { campaigns: ranked, loading: campaignsLoading || analyticsLoading };
}
