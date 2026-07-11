import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import CampaignCard from '../components/CampaignCard';
import CampaignSkeleton from '../components/CampaignSkeleton';
import EmptyState from '../components/EmptyState';
import { useCampaigns } from '../hooks/useCampaigns';
import { useAuth } from '../context/AuthContext';
import { OFFICE_LEVELS } from '../utils/campaignHelpers';

export default function Campaigns() {
  const { user, isVerified } = useAuth();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [office, setOffice] = useState('');

  const { campaigns, loading, error: loadError } = useCampaigns({
    status: 'active',
    sort: 'newest',
  });

  const filtered = useMemo(() => {
    let list = [...campaigns];
    if (verifiedOnly) list = list.filter((c) => c.verified);
    if (office) list = list.filter((c) => c.campaignType === office);
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.title?.toLowerCase().includes(term) ||
          c.description?.toLowerCase().includes(term) ||
          c.ownerName?.toLowerCase().includes(term) ||
          c.campaignType?.toLowerCase().includes(term)
      );
    }
    if (sort === 'updated') {
      list.sort((a, b) => {
        const da = a.updatedAt || a.createdAt || '';
        const db = b.updatedAt || b.createdAt || '';
        return String(db).localeCompare(String(da));
      });
    }
    return list;
  }, [campaigns, search, verifiedOnly, office, sort]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
        <h1 className="text-3xl font-bold text-white mb-2">Campaign Directory</h1>
        <p className="text-gray-400">Official political campaign pages across Ghana — a public record citizens can trust.</p>
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
          <select value={office} onChange={(e) => setOffice(e.target.value)} className="input-field sm:w-44">
            <option value="">All offices</option>
            {OFFICE_LEVELS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="input-field sm:w-44">
            <option value="newest">Newest</option>
            <option value="updated">Recently updated</option>
          </select>
          <button
            type="button"
            onClick={() => setVerifiedOnly((v) => !v)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              verifiedOnly
                ? 'bg-brand-600/20 border-brand-500 text-brand-400'
                : 'bg-surface-elevated border-surface-border text-gray-400'
            }`}
          >
            Official pages
          </button>
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
          actionLabel={user && isVerified ? 'Launch Campaign Page' : user ? 'Confirm your email to launch' : 'Create account'}
          actionTo={user && isVerified ? '/upload' : user ? '/verify-email' : '/signup'}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((c, i) => (
            <CampaignCard key={c.id} campaign={c} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
