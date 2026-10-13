import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { subscribeCampaign, subscribeMyCampaigns } from '../services/campaignFirestoreService';
import { subscribeSupporters } from '../services/supporterService';
import { subscribeDonations } from '../services/donationService';
import { subscribeVolunteers } from '../services/volunteerService';
import { subscribeEvents } from '../services/eventService';
import { subscribeCampaignAnalytics } from '../services/analyticsService';
import {
  subscribeAds,
  subscribeStations,
  subscribeFieldLinks,
  subscribeResults,
  subscribePollResponses,
  subscribeBroadcasts,
  subscribeTransactions,
} from '../services/workspaceService';
import { getBillingState } from '../utils/billing';
import { useAuth } from './AuthContext';

/* ------------------------------------------------------------------ */
/* My campaigns (sidebar switcher + dashboard home)                     */
/* ------------------------------------------------------------------ */

const MyCampaignsContext = createContext({ campaigns: [], loading: true, error: null });

export function MyCampaignsProvider({ children, mock }) {
  const { user } = useAuth();
  const [state, setState] = useState({ campaigns: mock || [], loading: !mock, error: null });

  useEffect(() => {
    if (mock || !user?.uid) return undefined;
    setState((s) => ({ ...s, loading: true }));
    return subscribeMyCampaigns(
      user.uid,
      (campaigns) => setState({ campaigns, loading: false, error: null }),
      (err) => setState({ campaigns: [], loading: false, error: err.message }),
    );
  }, [user?.uid, mock]);

  return <MyCampaignsContext.Provider value={state}>{children}</MyCampaignsContext.Provider>;
}

export function useMyCampaigns() {
  return useContext(MyCampaignsContext);
}

/* ------------------------------------------------------------------ */
/* Workspace — one campaign + lazily-subscribed collections            */
/* ------------------------------------------------------------------ */

const WorkspaceContext = createContext(null);

function makeSubscribers(uid) {
  return {
    voters: (id, cb) => subscribeSupporters(id, cb),
    donations: (id, cb) => subscribeDonations(id, cb),
    volunteers: (id, cb) => subscribeVolunteers(id, cb),
    events: (id, cb) => subscribeEvents(id, cb),
    analytics: (id, cb) => subscribeCampaignAnalytics(id, cb),
    ads: (id, cb) => subscribeAds(id, cb),
    stations: (id, cb) => subscribeStations(id, cb),
    fieldLinks: (id, cb) => subscribeFieldLinks(id, cb),
    results: (id, cb) => subscribeResults(id, cb),
    pollResponses: (id, cb) => subscribePollResponses(id, cb),
    broadcasts: (id, cb) => subscribeBroadcasts(id, cb),
    transactions: (id, cb) => (uid ? subscribeTransactions(id, uid, cb) : (cb([]), () => {})),
  };
}

export function WorkspaceProvider({ campaignId, children, mock }) {
  const { user } = useAuth();
  const [campaign, setCampaign] = useState(mock?.campaign || null);
  const [loading, setLoading] = useState(!mock);
  const [error, setError] = useState(null);
  const [data, setData] = useState(mock?.data || {});
  const unsubs = useRef({});
  const subscribers = useMemo(() => makeSubscribers(user?.uid), [user?.uid]);

  useEffect(() => {
    if (mock) return undefined;
    setLoading(true);
    setError(null);
    setCampaign(null);
    return subscribeCampaign(
      campaignId,
      (c) => {
        setCampaign(c);
        setLoading(false);
        if (!c) setError('not-found');
      },
      (err) => {
        setError(err.code === 'permission-denied' ? 'forbidden' : err.message);
        setLoading(false);
      },
    );
  }, [campaignId, mock]);

  // Tear down collection listeners when switching campaigns.
  useEffect(() => {
    const current = unsubs.current;
    return () => {
      Object.values(current).forEach((u) => {
        try {
          u?.();
        } catch {
          /* ignore */
        }
      });
      unsubs.current = {};
      if (!mock) setData({});
    };
  }, [campaignId, mock]);

  const ensure = useCallback(
    (name) => {
      if (mock || !campaignId || unsubs.current[name] || !subscribers[name]) return;
      unsubs.current[name] = subscribers[name](campaignId, (rows) => {
        setData((prev) => ({ ...prev, [name]: rows }));
      });
    },
    [campaignId, mock, subscribers],
  );

  const billing = useMemo(() => getBillingState(campaign), [campaign]);

  const value = useMemo(
    () => ({ campaignId, campaign, loading, error, data, ensure, billing, isPro: billing.isPro, isMock: !!mock }),
    [campaignId, campaign, loading, error, data, ensure, billing, mock],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return ctx;
}

/** Subscribe (once) to a workspace collection and read its rows. */
export function useWorkspaceData(name, fallback = []) {
  const { ensure, data } = useWorkspace();
  useEffect(() => {
    ensure(name);
  }, [ensure, name]);
  const loaded = Object.prototype.hasOwnProperty.call(data, name);
  return { rows: loaded ? data[name] : fallback, loading: !loaded };
}
