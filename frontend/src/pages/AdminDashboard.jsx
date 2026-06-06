import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Sidebar from '../components/Sidebar';
import AnalyticsWidget from '../components/AnalyticsWidget';
import { AdminVerificationPanel, AdminReportsPanel, AdminCommentsPanel, handleExtensionApproval } from '../components/admin/AdminPanels';
import { useAdminCampaigns } from '../hooks/useCampaigns';
import {
  deleteCampaign,
  extendCampaign,
  toggleFeatured,
  toggleSpotlight,
} from '../services/campaignFirestoreService';
import {
  verifyPaymentAndActivate,
  rejectPayment,
  getPaymentByCampaign,
} from '../services/paymentService';
import { verifyCampaign } from '../services/verificationService';
import { formatDate, getStatusBadgeClass } from '../utils/helpers';
import { getStatusLabel } from '../utils/campaignHelpers';
import { PACKAGES } from '../data/packages';
import { db } from '../firebase/auth';
import VerificationBadge from '../components/VerificationBadge';

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'active', label: 'Approved' },
  { key: 'expired', label: 'Expired' },
  { key: 'rejected', label: 'Rejected' },
];

export default function AdminDashboard() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [actionLoading, setActionLoading] = useState(null);
  const [payments, setPayments] = useState({});
  const { campaigns, stats, loading, error } = useAdminCampaigns(filter);

  useEffect(() => {
    getDocs(collection(db, 'payments')).then((snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const map = {};
      all.forEach((p) => {
        const existing = map[p.campaignId];
        const prefer = (a, b) => {
          if (!a) return b;
          if (a.type === 'extension' && a.paymentStatus === 'pending_review') return a;
          if (b.type === 'extension' && b.paymentStatus === 'pending_review') return b;
          if (a.paymentStatus === 'pending_review') return a;
          if (b.paymentStatus === 'pending_review') return b;
          return b;
        };
        map[p.campaignId] = prefer(existing, p);
      });
      setPayments(map);
    });
  }, [campaigns]);

  const handleVerify = async (campaign) => {
    setActionLoading(campaign.id + 'verify');
    try {
      const payment = payments[campaign.id] || await getPaymentByCampaign(campaign.id);
      if (!payment) throw new Error('No payment record found');
      if (payment.type === 'extension') {
        await handleExtensionApproval({ payment, campaign, toast });
      } else {
        await verifyPaymentAndActivate({ paymentId: payment.id, campaignId: campaign.id, campaign });
        toast(`"${campaign.title}" is now live!`, 'success');
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (campaign) => {
    const reason = prompt('Rejection reason (optional):') || 'Payment could not be verified';
    setActionLoading(campaign.id + 'reject');
    try {
      const payment = payments[campaign.id];
      await rejectPayment({ paymentId: payment?.id, campaignId: campaign.id, ownerId: campaign.ownerId, reason });
      toast('Payment rejected', 'warning');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAction = async (action, campaign, extra) => {
    setActionLoading(campaign.id + action);
    try {
      switch (action) {
        case 'extend':
          await extendCampaign(campaign.id, extra || 7, campaign.endDate, campaign.durationDays);
          toast('Campaign extended', 'success');
          break;
        case 'feature':
          await toggleFeatured(campaign.id, !campaign.featured);
          break;
        case 'spotlight':
          await toggleSpotlight(campaign.id, !campaign.spotlight);
          break;
        case 'verify':
          await verifyCampaign(campaign.id, !campaign.verified, campaign.ownerId, campaign.title);
          toast(campaign.verified ? 'Verification revoked' : 'Campaign verified', 'success');
          break;
        case 'remove':
          if (window.confirm('Delete permanently?')) {
            await deleteCampaign(campaign.id);
            toast('Campaign deleted', 'info');
          }
          break;
        default:
          break;
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Delete ALL test data?')) return;
    try {
      for (const col of ['campaigns', 'payments', 'notifications', 'analytics', 'followers', 'comments', 'reports']) {
        const snap = await getDocs(collection(db, col));
        if (snap.empty) continue;
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.delete(doc(db, col, d.id)));
        await batch.commit();
      }
      toast('All test data cleared', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const renderCampaignList = () => (
    <div className="space-y-4">
      {campaigns.map((c) => {
        const pay = payments[c.id];
        const pkg = PACKAGES.find((p) => p.id === c.packageType);
        const isExtension = pay?.type === 'extension';
        return (
          <motion.div key={c.id} layout className="glass-card p-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <img src={c.bannerImage} alt={c.title} className="w-full sm:w-24 h-32 sm:h-24 rounded-xl object-cover bg-surface-elevated" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white">{c.title}</h3>
                  <span className={getStatusBadgeClass(c.status)}>{getStatusLabel(c.status)}</span>
                  <VerificationBadge verified={c.verified} />
                  {isExtension && <span className="badge-pending text-[10px]">extension</span>}
                </div>
                <p className="text-xs text-gray-500">/{c.slug} · {c.ownerName} · {c.views || 0} views · {c.followerCount || 0} supporters</p>
                <p className="text-xs text-gray-500 mt-1">{pkg?.name || c.packageName} · {pay?.amount || pkg?.price || '—'} GHS</p>
                {pay && <p className="text-xs text-brand-400 mt-1 font-mono">Ref: {pay.paymentReference} · {pay.paymentStatus}</p>}
              </div>
            </div>

            {pay?.screenshotUrl && (
              <a href={pay.screenshotUrl} target="_blank" rel="noopener noreferrer" className="block">
                <img src={pay.screenshotUrl} alt="Payment proof" className="max-h-40 rounded-xl border border-surface-border" />
              </a>
            )}

            <div className="flex flex-wrap gap-2">
              {(c.status === 'pending_review' || (isExtension && pay?.paymentStatus === 'pending_review')) && (
                <>
                  <button onClick={() => handleVerify(c)} disabled={!!actionLoading} className="btn-primary text-xs py-2 px-4">
                    {isExtension ? 'Approve Extension' : 'Verify & Activate'}
                  </button>
                  <button onClick={() => handleReject(c)} disabled={!!actionLoading} className="text-xs py-2 px-4 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">Reject</button>
                </>
              )}
              {c.status === 'active' && (
                <>
                  <button onClick={() => handleAction('extend', c, 7)} disabled={!!actionLoading} className="btn-secondary text-xs py-2 px-3">+7 Days</button>
                  <button onClick={() => handleAction('feature', c)} disabled={!!actionLoading} className="btn-secondary text-xs py-2 px-3">{c.featured ? 'Unfeature' : 'Feature'}</button>
                  <button onClick={() => handleAction('spotlight', c)} disabled={!!actionLoading} className="btn-secondary text-xs py-2 px-3">{c.spotlight ? 'Remove Spotlight' : 'Spotlight'}</button>
                  <button onClick={() => handleAction('verify', c)} disabled={!!actionLoading} className="btn-secondary text-xs py-2 px-3">{c.verified ? 'Revoke Verify' : 'Verify'}</button>
                </>
              )}
              <button onClick={() => handleAction('remove', c)} disabled={!!actionLoading} className="text-xs py-2 px-3 text-gray-500 hover:text-red-400">Delete</button>
            </div>
          </motion.div>
        );
      })}
      {campaigns.length === 0 && <p className="text-center text-gray-500 py-16">No campaigns.</p>}
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Control Center</h1>
            <p className="text-sm text-gray-500">{userProfile?.email}</p>
          </div>
          <button onClick={handleClearAll} className="text-xs text-red-400 border border-red-500/20 px-3 py-2 rounded-lg self-start">Clear Test Data</button>
        </div>

        {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}

        {activeTab === 'overview' && stats && (
          <div className="mb-8"><AnalyticsWidget stats={stats} /></div>
        )}

        {(activeTab === 'overview' || activeTab === 'campaigns') && (
          <>
            <div className="flex flex-wrap gap-2 mb-6">
              {FILTERS.map((f) => (
                <button key={f.key || 'all'} onClick={() => setFilter(f.key)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f.key ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30' : 'bg-surface-elevated text-gray-400'}`}>
                  {f.label}
                </button>
              ))}
            </div>
            {loading ? <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="card animate-pulse h-28 bg-surface-elevated" />)}</div> : renderCampaignList()}
          </>
        )}

        {activeTab === 'verification' && <AdminVerificationPanel campaigns={campaigns} />}
        {activeTab === 'reports' && <AdminReportsPanel />}
        {activeTab === 'comments' && <AdminCommentsPanel />}
      </div>
    </div>
  );
}
