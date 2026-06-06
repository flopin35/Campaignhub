import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import VerifyEmailNotice from '../components/VerifyEmailNotice';
import CampaignCard from '../components/CampaignCard';
import CampaignSkeleton from '../components/CampaignSkeleton';
import EmptyState from '../components/EmptyState';
import ExtendCampaignModal, { ExtendCampaignBanner } from '../components/ExtendCampaignModal';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/auth';
import { BarChart3, CheckCircle2 } from '../components/icons/AppIcons';
import { normalizeCampaign } from '../utils/campaignHelpers';

export default function Dashboard() {
  const { user, userProfile, isVerified, isAdmin, logout } = useAuth();
  const [myCampaigns, setMyCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [extendCampaign, setExtendCampaign] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'campaigns'), where('ownerId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setMyCampaigns(snap.docs.map(normalizeCampaign));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [user?.uid]);

  const active = myCampaigns.filter((c) => c.status === 'active' && !c.isExpired);
  const totalViews = myCampaigns.reduce((s, c) => s + (c.views || 0), 0);
  const totalFollowers = myCampaigns.reduce((s, c) => s + (c.followerCount || 0), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
              Dashboard
              {userProfile?.verified && <CheckCircle2 className="w-5 h-5 text-blue-400" title="Verified" />}
            </h1>
            <p className="text-gray-400 text-sm">Welcome, {userProfile?.name || user?.displayName}</p>
          </div>
          <div className="flex gap-2">
            <Link to="/notifications" className="btn-secondary text-sm">Notifications</Link>
            <button onClick={logout} className="btn-secondary text-sm">Logout</button>
          </div>
        </div>

        {!isVerified && <div className="mb-8"><VerifyEmailNotice /></div>}

        <div className="grid sm:grid-cols-4 gap-4 mb-8">
          <div className="card text-center py-4">
            <div className="text-2xl font-bold text-white">{myCampaigns.length}</div>
            <div className="text-xs text-gray-500 mt-1">Campaigns</div>
          </div>
          <div className="card text-center py-4">
            <div className="text-2xl font-bold text-emerald-400">{active.length}</div>
            <div className="text-xs text-gray-500 mt-1">Active</div>
          </div>
          <div className="card text-center py-4">
            <div className="text-2xl font-bold text-brand-400">{totalViews.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">Total Views</div>
          </div>
          <div className="card text-center py-4">
            <div className="text-2xl font-bold text-amber-400">{totalFollowers.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">Supporters</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          {isVerified ? (
            <Link to="/upload" className="btn-primary text-sm">Launch Campaign</Link>
          ) : (
            <button disabled className="btn-primary text-sm opacity-40 cursor-not-allowed">Launch Campaign</button>
          )}
          {isAdmin && <Link to="/admin" className="btn-secondary text-sm">Admin Panel</Link>}
        </div>

        {active.some((c) => c.remainingMs && c.remainingMs < 7 * 86400000) && (
          <div className="mb-8 space-y-3">
            {active.filter((c) => c.remainingMs && c.remainingMs < 7 * 86400000).map((c) => (
              <ExtendCampaignBanner key={c.id} campaign={c} onExtend={() => setExtendCampaign(c)} />
            ))}
          </div>
        )}

        {selectedCampaign && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Analytics — {selectedCampaign.title}</h2>
              <button onClick={() => setSelectedCampaign(null)} className="text-sm text-gray-500">Close</button>
            </div>
            <AnalyticsDashboard campaign={selectedCampaign} />
          </div>
        )}

        <h2 className="text-xl font-semibold text-white mb-4">My Campaigns</h2>
        {loading ? (
          <CampaignSkeleton count={2} />
        ) : myCampaigns.length === 0 ? (
          <EmptyState title="No campaigns yet" description="Upload your first campaign." actionLabel={isVerified ? 'Launch Campaign' : undefined} actionTo={isVerified ? '/upload' : undefined} />
        ) : (
          <div className="space-y-4">
            {myCampaigns.map((c, i) => (
              <div key={c.id} className="space-y-2">
                <CampaignCard campaign={c} index={i} showShareActions={c.status === 'active'} />
                <div className="flex flex-wrap gap-2 px-1">
                  {c.status === 'active' && (
                    <>
                      <Link to={`/campaign/${c.slug}/performance`} className="text-xs text-brand-400 hover:text-brand-300 inline-flex items-center gap-1">
                        <BarChart3 className="w-3.5 h-3.5" />
                        Performance →
                      </Link>
                      <button onClick={() => setSelectedCampaign(c)} className="text-xs text-gray-400 hover:text-white">
                        Quick analytics
                      </button>
                      <button onClick={() => setExtendCampaign(c)} className="text-xs text-amber-400 hover:text-amber-300">
                        Extend campaign
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {extendCampaign && (
        <ExtendCampaignModal campaign={extendCampaign} onClose={() => setExtendCampaign(null)} />
      )}
    </div>
  );
}
