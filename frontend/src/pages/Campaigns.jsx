import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import CampaignCard from '../components/CampaignCard';
import CampaignSkeleton from '../components/CampaignSkeleton';
import EmptyState from '../components/EmptyState';
import { useCampaigns } from '../hooks/useCampaigns';
import { useViralCampaigns } from '../hooks/useViralCampaigns';
import { CATEGORIES } from '../utils/campaignHelpers';

export default function Campaigns() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [eliteOnly, setEliteOnly] = useState(false);

  const useViralSort = sort === 'trending';
  const { campaigns: firestoreCampaigns, loading: fsLoading } = useCampaigns({
    status: 'active',
    featured: featuredOnly || undefined,
    category: category || undefined,
    sort: useViralSort ? 'trending' : 'newest',
  });
  const { campaigns: viralCampaigns, loading: viralLoading } = useViralCampaigns({
    sortBy: sort === 'trending' ? 'viral' : 'newest',
    limit: 50,
  });

  const campaigns = sort === 'trending' ? viralCampaigns : firestoreCampaigns;
  const loading = sort === 'trending' ? viralLoading : fsLoading;

  const filtered = useMemo(() => {
    let list = campaigns;
    if (category) list = list.filter((c) => c.category === category);
    if (featuredOnly) list = list.filter((c) => c.featured);
    if (verifiedOnly) list = list.filter((c) => c.verified);
    if (eliteOnly) list = list.filter((c) => c.packageType === 'elite');
    if (!search.trim()) return list;
    const term = search.toLowerCase();
    return list.filter(
      (c) =>
        c.title?.toLowerCase().includes(term) ||
        c.description?.toLowerCase().includes(term) ||
        c.ownerName?.toLowerCase().includes(term) ||
        c.category?.toLowerCase().includes(term)
    );
  }, [campaigns, search, category, featuredOnly, verifiedOnly, eliteOnly]);

  const toggle = (setter, val) => setter(!val);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Discover Campaigns</h1>
        <p className="text-gray-400">Search, filter, and explore live campaigns in real time.</p>
      </motion.div>

      <div className="flex flex-col gap-4 mb-8">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, owner, or category..."
          className="input-field"
        />
        <div className="flex flex-wrap gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field sm:w-44">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="input-field sm:w-40">
            <option value="newest">Newest</option>
            <option value="trending">Trending</option>
          </select>
          {[
            { label: 'Featured', val: featuredOnly, set: setFeaturedOnly },
            { label: 'Verified', val: verifiedOnly, set: setVerifiedOnly },
            { label: 'Elite', val: eliteOnly, set: setEliteOnly },
          ].map((f) => (
            <button
              key={f.label}
              onClick={() => toggle(f.set, f.val)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                f.val ? 'bg-brand-600/20 border-brand-500 text-brand-400' : 'bg-surface-elevated border-surface-border text-gray-400'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <CampaignSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState title="No campaigns found" description="Try adjusting your filters." actionLabel="Launch a Campaign" actionTo="/upload" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((c, i) => <CampaignCard key={c.id} campaign={c} index={i} />)}
        </div>
      )}
    </div>
  );
}
