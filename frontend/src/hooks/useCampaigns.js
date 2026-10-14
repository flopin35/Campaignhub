import { useEffect, useState, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase/auth';
import { normalizeCampaign, isCampaignVisible, sortCampaignsForDisplay } from '../utils/campaignHelpers';
import { expireOverdueCampaigns, pickCampaignForSlug } from '../services/campaignFirestoreService';
import { expireCampaignBoosts } from '../services/boostService';

const PUBLIC_POLL_MS = 90_000;

function sortCampaignsClientSide(raw, sort) {
  const visible = raw.filter(isCampaignVisible);
  if (sort === 'trending') {
    return [...visible].sort((a, b) => (b.views || 0) - (a.views || 0));
  }
  return sortCampaignsForDisplay(visible);
}

/**
 * Fetch campaigns — public pages use polling (not live listeners) to avoid QUIC/WebChannel errors.
 */
export function useCampaigns(options = {}) {
  const { status = 'active', featured, category, sort = 'newest', realtime = false, pollInterval = PUBLIC_POLL_MS } = options;
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    setError(null);

    const constraints = [where('status', '==', status)];
    if (featured) constraints.push(where('featured', '==', true));
    if (category) constraints.push(where('category', '==', category));

    const q = query(collection(db, 'campaigns'), ...constraints);

    const process = (snap) => {
      if (!mounted.current) return;
      const raw = snap.docs.map(normalizeCampaign);
      setCampaigns(sortCampaignsClientSide(raw, sort));
      setLoading(false);
      setError(null);
    };

    const onErr = (err) => {
      if (!mounted.current) return;
      console.error('Campaigns fetch error:', err);
      setError(err.message);
      setLoading(false);
    };

    if (realtime) {
      const unsub = onSnapshot(q, (snap) => process(snap), onErr);
      return () => {
        mounted.current = false;
        unsub();
      };
    }

    let timer;
    const load = () => getDocs(q).then(process).catch(onErr);
    load();
    if (pollInterval > 0) {
      timer = setInterval(load, pollInterval);
    }

    return () => {
      mounted.current = false;
      if (timer) clearInterval(timer);
    };
  }, [status, featured, category, sort, realtime, pollInterval]);

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
        await expireCampaignBoosts(data);

        const all = snap.docs.map(normalizeCampaign);

        const filtered = (() => {
          if (!statusFilter) return all;
          if (statusFilter === 'pending') {
            return all.filter((c) => ['payment_pending', 'pending_review', 'pending'].includes(c.status));
          }
          if (statusFilter === 'expired') {
            return all.filter((c) => c.status === 'expired' || c.isExpired);
          }
          if (statusFilter === 'disabled') {
            return all.filter((c) => c.disabled || c.status === 'disabled');
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
 * Load a campaign by slug.
 * Public pages only see active campaigns; owners can load their own drafts/pending campaigns.
 */
export function useCampaign(slug, { ownerId = null } = {}) {
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return undefined;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const finish = (snap, notFoundMessage = 'Campaign not found') => {
      if (cancelled) return;
      const found = snap.empty
        ? null
        : pickCampaignForSlug(snap.docs.map(normalizeCampaign).filter((c) => c.status !== 'deleted'));
      if (!found) {
        setCampaign(null);
        setError(notFoundMessage);
      } else {
        setCampaign(found);
        setError(null);
      }
      setLoading(false);
    };

    const onErr = (err) => {
      if (cancelled) return;
      setError(err.message);
      setLoading(false);
    };

    const publicQ = query(
      collection(db, 'campaigns'),
      where('slug', '==', slug),
      where('status', '==', 'active')
    );

    getDocs(publicQ)
      .then((snap) => {
        if (cancelled) return;
        if (!snap.empty) {
          finish(snap);
          return;
        }
        if (!ownerId) {
          finish(snap);
          return;
        }
        const ownerQ = query(
          collection(db, 'campaigns'),
          where('slug', '==', slug),
          where('ownerId', '==', ownerId)
        );
        return getDocs(ownerQ).then((ownerSnap) => finish(ownerSnap));
      })
      .catch(onErr);

    return () => {
      cancelled = true;
    };
  }, [slug, ownerId]);

  return { campaign, loading, error };
}
