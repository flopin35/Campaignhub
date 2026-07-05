import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import CampaignCard from '../components/CampaignCard';
import CampaignSkeleton from '../components/CampaignSkeleton';
import EmptyState from '../components/EmptyState';
import { useCampaigns } from '../hooks/useCampaigns';
import { useViralCampaigns } from '../hooks/useViralCampaigns';
import { useAuth } from '../context/AuthContext';
import { CATEGORIES, OFFICE_LEVELS } from '../utils/campaignHelpers';

export default function Campaigns() {
  const { user, isVerified } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [office, setOffice] = useState('');

  const useViralSort = sort === 'trending';
  const { campaigns: firestoreCampaigns, loading: fsLoading, error: fsError } = useCampaigns({
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
  const loadError = sort === 'trending' ? null : fsError;

  const filtered = useMemo(() => {
    let list = campaigns;
    if (category) list = list.filter((c) => c.category === category);
    if (featuredOnly) list = list.filter((c) => c.featured);
    if (verifiedOnly) list = list.filter((c) => c.verified);
    if (office) list = list.filter((c) => c.campaignType === office);
    if (!search.trim()) return list;
    const term = search.toLowerCase();
    return list.filter(
      (c) =>
        c.title?.toLowerCase().includes(term) ||
        c.description?.toLowerCase().includes(term) ||
        c.ownerName?.toLowerCase().includes(term) ||
        c.category?.toLowerCase().includes(term)
    );
  }, [campaigns, search, category, featuredOnly, verifiedOnly, office]);

  const toggle = (setter, val) => setter(!val);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Campaign Directory</h1>
        <p className="text-gray-400">Discover official political campaign pages — not a marketplace, a public record.</p>
      </motion.div>

      <div className="flex flex-col gap-4 mb-8">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by candidate, party, or constituency..."
          className="input-field"
        />
        <div className="flex flex-wrap gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field sm:w-44">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={office} onChange={(e) => setOffice(e.target.value)} className="input-field sm:w-44">
            <option value="">All offices</option>
            {OFFICE_LEVELS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="input-field sm:w-40">
            <option value="newest">Newest</option>
            <option value="trending">Most active</option>
          </select>
          {[
            { label: 'Featured', val: featuredOnly, set: setFeaturedOnly },
            { label: 'Official', val: verifiedOnly, set: setVerifiedOnly },
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
      ) : loadError ? (
        <div className="text-center py-16 px-4">
          <p className="text-red-400 mb-2">Could not load campaign pages</p>
          <p className="text-gray-500 text-sm mb-4">{loadError}</p>
          <button type="button" onClick={() => window.location.reload()} className="btn-secondary text-sm">
            Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No campaign pages found"
          description={campaigns.length === 0 ? 'Be the first to launch an official campaign page.' : 'Try adjusting your filters.'}
          actionLabel={user && isVerified ? 'Launch Campaign Page' : user ? 'Verify email to launch' : 'Create account'}
          actionTo={user && isVerified ? '/upload' : user ? '/verify-email' : '/signup'}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((c, i) => <CampaignCard key={c.id} campaign={c} index={i} />)}
        </div>
      )}
    </div>
  );
}
