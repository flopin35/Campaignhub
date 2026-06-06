import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/auth';
import { normalizeCampaign, isCampaignVisible } from '../utils/campaignHelpers';
import { expireOverdueCampaigns } from '../services/campaignFirestoreService';

/**
 * Real-time Firestore listener for campaigns.
 */
export function useCampaigns(options = {}) {
  const { status = 'active', featured, category, sort = 'newest', realtime = true } = options;
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const constraints = [where('status', '==', status)];
    if (featured) constraints.push(where('featured', '==', true));
    if (category) constraints.push(where('category', '==', category));

    constraints.push(sort === 'trending' ? orderBy('views', 'desc') : orderBy('createdAt', 'desc'));

    const q = query(collection(db, 'campaigns'), ...constraints);

    const process = (snap) => {
      const data = snap.docs.map(normalizeCampaign).filter(isCampaignVisible);
      setCampaigns(data);
      setLoading(false);
    };

    if (realtime) {
      const unsub = onSnapshot(
        q,
        (snap) => process(snap),
        (err) => {
          console.error('Campaigns listener error:', err);
          setError(err.message);
          setLoading(false);
        }
      );
      return unsub;
    }

    import('firebase/firestore').then(({ getDocs }) => {
      getDocs(q).then(process).catch((err) => {
        setError(err.message);
        setLoading(false);
      });
    });
  }, [status, featured, category, sort, realtime]);

  return { campaigns, loading, error };
}

/**
 * Real-time listener for all campaigns (admin).
 */
export function useAdminCampaigns(statusFilter = '') {
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const q = query(collection(db, 'campaigns'), orderBy('createdAt', 'desc'));

    const unsub = onSnapshot(
      q,
      async (snap) => {
        let data = snap.docs.map(normalizeCampaign);
        await expireOverdueCampaigns(data);

        const all = snap.docs.map(normalizeCampaign);

        const filtered = (() => {
          if (!statusFilter) return all;
          if (statusFilter === 'pending') {
            return all.filter((c) => ['payment_pending', 'pending_review', 'pending'].includes(c.status));
          }
          if (statusFilter === 'expired') {
            return all.filter((c) => c.status === 'expired' || c.isExpired);
          }
          return all.filter((c) => c.status === statusFilter);
        })();

        setCampaigns(filtered);
        setStats({
          total: all.length,
          active: all.filter((c) => c.status === 'active' && !c.isExpired).length,
          pending: all.filter((c) => ['payment_pending', 'pending_review', 'pending'].includes(c.status)).length,
          expired: all.filter((c) => c.status === 'expired' || c.isExpired).length,
          totalViews: all.reduce((s, c) => s + (c.views || 0), 0),
          totalShares: all.reduce((s, c) => s + (c.shares || 0), 0),
        });
        setLoading(false);
      },
      (err) => {
        console.error('Admin campaigns error:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsub;
  }, [statusFilter]);

  return { campaigns, stats, loading, error };
}

/**
 * Real-time single campaign by slug.
 */
export function useCampaign(slug) {
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;

    const q = query(collection(db, 'campaigns'), where('slug', '==', slug));

    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          setCampaign(null);
          setError('Campaign not found');
        } else {
          setCampaign(normalizeCampaign(snap.docs[0]));
          setError(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsub;
  }, [slug]);

  return { campaign, loading, error };
}
