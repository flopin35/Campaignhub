import { createContext, useContext, useState, useMemo } from 'react';

const DashboardCampaignContext = createContext({
  campaign: null,
  setCampaign: () => {},
});

export function DashboardCampaignProvider({ children }) {
  const [campaign, setCampaign] = useState(null);
  const value = useMemo(() => ({ campaign, setCampaign }), [campaign]);
  return (
    <DashboardCampaignContext.Provider value={value}>
      {children}
    </DashboardCampaignContext.Provider>
  );
}

export function useDashboardCampaign() {
  return useContext(DashboardCampaignContext);
}
