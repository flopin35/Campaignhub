import { useMemo, useState } from 'react';
import { Search, Megaphone } from 'lucide-react';
import { useCampaigns } from '../hooks/useCampaigns';
import CampaignCard from '../components/CampaignCard';
import { EmptyState, Skeleton } from '../components/ui';
import { OFFICE_LEVELS, isBoostActive } from '../utils/campaignHelpers';
import { GHANA_REGIONS } from '../data/ghanaRegions';

export default function Campaigns() {
  const { campaigns, loading, error } = useCampaigns({});
  const [q, setQ] = useState('');
  const [office, setOffice] = useState('');
  const [region, setRegion] = useState('');

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return campaigns.filter((c) => {
      if (office && c.campaignType !== office) return false;
      if (region && c.region !== region) return false;
      if (term) {
        return `${c.title} ${c.candidateName} ${c.party} ${c.constituency} ${c.region} ${c.slogan}`.toLowerCase().includes(term);
      }
      return true;
    });
  }, [campaigns, q, office, region]);

  const spotlight = list.filter(isBoostActive);
  const rest = list.filter((c) => !isBoostActive(c));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <p className="eyebrow">Campaign directory</p>
      <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold text-ink">Find a candidate</h1>
      <p className="mt-3 text-lg text-ink-2 max-w-2xl">Official campaign pages from candidates across Ghana — every party and independents.</p>

      <div className="mt-8 grid sm:grid-cols-[1fr_200px_200px] gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-ink-3 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input className="input pl-10" placeholder="Search by name, party, constituency…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search campaigns" />
        </div>
        <select className="input" value={office} onChange={(e) => setOffice(e.target.value)} aria-label="Office">
          <option value="">All offices</option>
          {OFFICE_LEVELS.map((o) => <option key={o}>{o}</option>)}
        </select>
        <select className="input" value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Region">
          <option value="">All regions</option>
          {GHANA_REGIONS.map((r) => <option key={r}>{r}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
        </div>
      ) : error ? (
        <EmptyState icon={Megaphone} title="Couldn't load campaigns" text="Check your connection and refresh the page." />
      ) : list.length === 0 ? (
        <EmptyState icon={Megaphone} title="No campaign pages found" text="Try a different search or filter." />
      ) : (
        <>
          {spotlight.length > 0 && (
            <div className="mt-10">
              <p className="text-sm font-semibold text-ink mb-3">In the spotlight</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {spotlight.map((c) => <CampaignCard key={c.id} campaign={c} />)}
              </div>
            </div>
          )}
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rest.map((c) => <CampaignCard key={c.id} campaign={c} />)}
          </div>
        </>
      )}
    </div>
  );
}
