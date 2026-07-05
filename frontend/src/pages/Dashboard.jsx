import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePremiumModal } from '../context/PremiumModalContext';
import VerifyEmailNotice from '../components/VerifyEmailNotice';
import CampaignSkeleton from '../components/CampaignSkeleton';
import EmptyState from '../components/EmptyState';
import ExtendCampaignModal, { ExtendCampaignBanner } from '../components/ExtendCampaignModal';
import CampaignWorkspace from '../components/CampaignWorkspace';
import { PREMIUM_FEATURE_IDS, getPurchasablePlan } from '../data/premiumPackages';
import { hasPremiumSubscription } from '../utils/featureAccess';
import PremiumActiveBadge from '../components/PremiumActiveBadge';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/auth';
import { deleteCampaign, hideCampaignFromPublic, relaunchCampaign } from '../services/campaignFirestoreService';
import { CheckCircle2, Plus, Sparkles, Bell } from 'lucide-react';
import { getStatusLabel } from '../utils/campaignHelpers';
import { getStatusBadgeClass } from '../utils/helpers';
import { normalizeCampaign } from '../utils/campaignHelpers';
import { useDashboardCampaign } from '../context/DashboardCampaignContext';
import { BRAND_COPY } from '../data/brand';

export default function Dashboard() {
  const { user, userProfile, isVerified, isAdmin, logout } = useAuth();
  const { toast } = useToast();
  const { openPremiumModal } = usePremiumModal();
  const { setCampaign: setDashboardCampaign } = useDashboardCampaign();
  const [searchParams, setSearchParams] = useSearchParams();
  const [myCampaigns, setMyCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [extendCampaign, setExtendCampaign] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [relaunchingId, setRelaunchingId] = useState(null);

  const selectedSlug = searchParams.get('campaign');
  const activeTab = searchParams.get('tab') || 'overview';
  const selectedCampaign = myCampaigns.find((c) => c.slug === selectedSlug)
    || (myCampaigns.length === 1 ? myCampaigns[0] : null);

  const setSelected = (campaign, tab = 'overview') => {
    const next = new URLSearchParams(searchParams);
    if (campaign) {
      next.set('campaign', campaign.slug);
      next.set('tab', tab);
    } else {
      next.delete('campaign');
      next.delete('tab');
    }
    setSearchParams(next, { replace: true });
  };

  const setTab = (tab) => {
    if (!selectedCampaign) return;
    const next = new URLSearchParams(searchParams);
    next.set('campaign', selectedCampaign.slug);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    setDashboardCampaign(selectedCampaign || null);
    return () => setDashboardCampaign(null);
  }, [selectedCampaign, setDashboardCampaign]);

  useEffect(() => {
    const upgrade = searchParams.get('upgrade');
    if (!upgrade || !getPurchasablePlan(upgrade)) return;
    const variant = searchParams.get('variant');
    openPremiumModal({ planId: upgrade, variantId: variant || null });
    const next = new URLSearchParams(searchParams);
    next.delete('upgrade');
    next.delete('variant');
    setSearchParams(next, { replace: true });
  }, [searchParams, openPremiumModal, setSearchParams]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, 'campaigns'), where('ownerId', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setMyCampaigns(snap.docs.map(normalizeCampaign));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [user?.uid]);

  useEffect(() => {
    if (loading || myCampaigns.length === 0) return;
    if (selectedSlug && myCampaigns.some((c) => c.slug === selectedSlug)) return;
    if (selectedSlug && myCampaigns.length > 1) {
      const next = new URLSearchParams(searchParams);
      next.delete('campaign');
      setSearchParams(next, { replace: true });
      return;
    }
    if (myCampaigns.length === 1 && !selectedSlug) {
      setSelected(myCampaigns[0], activeTab);
    }
  }, [loading, myCampaigns, selectedSlug, activeTab]);

  const handleHideOrDelete = async (campaign) => {
    const isLive = campaign.status === 'active' && !campaign.isExpired;
    const isHidden = campaign.status === 'disabled' || campaign.disabled;
    const message = isLive
      ? `Hide "${campaign.title}" from the public directory? The official campaign page will go offline immediately. You can relaunch later.`
      : `Permanently remove the archived page for "${campaign.title}"? This cannot be undone — records may be retained per platform policy.`;
    if (!window.confirm(message)) return;

    setDeletingId(campaign.id);
    try {
      if (isLive) {
        await hideCampaignFromPublic(campaign.id);
        toast('Campaign page hidden from directory', 'success');
      } else {
        await deleteCampaign(campaign.id);
        if (selectedCampaign?.id === campaign.id) setSelected(null);
        toast('Archived page removed', 'success');
      }
    } catch (err) {
      toast(err.message || 'Action failed', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRelaunch = async (campaign) => {
    if (!window.confirm(`Relaunch "${campaign.title}" on the public directory?`)) return;
    setRelaunchingId(campaign.id);
    try {
      await relaunchCampaign(campaign.id);
      toast('Campaign page is live again', 'success');
    } catch (err) {
      toast(err.message || 'Failed to relaunch', 'error');
    } finally {
      setRelaunchingId(null);
    }
  };

  const selectedIsPremium = hasPremiumSubscription(selectedCampaign);
  const active = myCampaigns.filter((c) => c.status === 'active' && !c.isExpired);
  const totalViews = myCampaigns.reduce((s, c) => s + (c.views || 0), 0);
  const totalSupporters = myCampaigns.reduce((s, c) => s + (c.followerCount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 lg:py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex flex-col gap-4 mb-5 sm:mb-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white flex items-center gap-2">
                My Campaign Pages
                {userProfile?.verified && <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" title="Verified account" />}
              </h1>
              <p className="text-gray-500 text-sm mt-0.5 truncate">
                Manage your official campaign pages — {userProfile?.name || user?.displayName}
              </p>
            </div>
            <Link to="/notifications" className="btn-secondary text-sm p-2.5 shrink-0 sm:hidden" aria-label="Notifications">
              <Bell className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            {isVerified && (
              <Link to="/upload" className="btn-primary text-sm col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5">
                <Plus className="w-4 h-4" /> {BRAND_COPY.launchCta}
              </Link>
            )}
            {selectedIsPremium ? (
              <PremiumActiveBadge campaign={selectedCampaign} className="col-span-2 sm:col-span-1" />
            ) : (
              <button type="button" onClick={() => openPremiumModal({ planId: PREMIUM_FEATURE_IDS.PREMIUM_SUBSCRIPTION, campaign: selectedCampaign })} className="btn-secondary text-sm inline-flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Premium
              </button>
            )}
            <Link to="/notifications" className="btn-secondary text-sm p-2.5 hidden sm:inline-flex" aria-label="Notifications">
              <Bell className="w-4 h-4" />
            </Link>
            {isAdmin && <Link to="/admin" className="btn-secondary text-sm text-center">Admin</Link>}
            <button onClick={logout} className="btn-secondary text-sm hidden sm:inline-flex">Logout</button>
          </div>
        </div>

        {!isVerified && <div className="mb-6"><VerifyEmailNotice compact /></div>}

        {/* Expiry warnings */}
        {active.filter((c) => c.remainingMs && c.remainingMs < 7 * 86400000).map((c) => (
          <div key={c.id} className="mb-4">
            <ExtendCampaignBanner campaign={c} onExtend={() => setExtendCampaign(c)} />
          </div>
        ))}

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-5 sm:mb-6">
          {[
            { label: 'Pages', value: myCampaigns.length },
            { label: 'Live', value: active.length, accent: 'text-emerald-400' },
            { label: 'Page views', value: totalViews.toLocaleString(), accent: 'text-brand-400' },
            { label: 'Followers', value: totalSupporters.toLocaleString(), accent: 'text-amber-400' },
          ].map((s) => (
            <div key={s.label} className="bg-surface-elevated/50 rounded-xl border border-surface-border px-3 sm:px-4 py-2.5 sm:py-3">
              <div className={`text-lg sm:text-xl font-bold ${s.accent || 'text-white'}`}>{s.value}</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <CampaignSkeleton count={2} />
        ) : myCampaigns.length === 0 ? (
          <EmptyState
            title="No campaign pages yet"
            description="Launch your first official campaign page — share your message, official link, and QR code with voters and supporters."
            actionLabel={isVerified ? BRAND_COPY.launchCta : undefined}
            actionTo={isVerified ? '/upload' : undefined}
          />
        ) : (
          <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-6 lg:items-start">
            {/* Mobile — horizontal campaign picker */}
            {myCampaigns.length > 1 && (
              <div className="lg:hidden -mx-4 px-4 mobile-scroll-x">
                <div className="flex gap-2 pb-1">
                  {myCampaigns.map((c) => {
                    const isSelected = selectedCampaign?.id === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelected(c)}
                        className={`shrink-0 max-w-[220px] text-left rounded-xl border p-3 min-h-[44px] transition-all touch-manipulation ${
                          isSelected
                            ? 'border-brand-500/50 bg-brand-600/10'
                            : 'border-surface-border bg-surface-elevated/40'
                        }`}
                      >
                        <p className="text-sm font-medium text-white line-clamp-1">{c.title}</p>
                        <p className="text-[10px] text-gray-500 mt-1">
                          {(c.views || 0).toLocaleString()} page views
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Desktop — campaign sidebar */}
            <aside className="hidden lg:block lg:col-span-4 xl:col-span-3 space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide px-1 mb-2">Your campaign pages</p>
              {myCampaigns.map((c) => {
                const isSelected = selectedCampaign?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelected(c)}
                    className={`w-full text-left rounded-xl border p-3 min-h-[44px] transition-all touch-manipulation ${
                      isSelected
                        ? 'border-brand-500/50 bg-brand-600/10 shadow-sm'
                        : 'border-surface-border bg-surface-elevated/40 hover:border-surface-border/80 hover:bg-surface-elevated/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-white line-clamp-2 leading-snug">{c.title}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${getStatusBadgeClass(c.status)}`}>
                        {getStatusLabel(c.status)}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1.5">
                      {(c.views || 0).toLocaleString()} page views · {(c.followerCount || 0)} followers
                    </p>
                  </button>
                );
              })}
            </aside>

            {/* Workspace */}
            <main className="lg:col-span-8 xl:col-span-9 glass-card p-3 sm:p-4 lg:p-6">
              <CampaignWorkspace
                campaign={selectedCampaign}
                activeTab={activeTab}
                onTabChange={setTab}
                onExtend={selectedCampaign?.status === 'active' ? () => setExtendCampaign(selectedCampaign) : undefined}
                onDelete={selectedCampaign ? () => handleHideOrDelete(selectedCampaign) : undefined}
                onRelaunch={
                  selectedCampaign && (selectedCampaign.status === 'disabled' || selectedCampaign.disabled)
                    ? () => handleRelaunch(selectedCampaign)
                    : undefined
                }
                relaunching={relaunchingId === selectedCampaign?.id}
                hiding={deletingId === selectedCampaign?.id}
              />
            </main>
          </div>
        )}
      </motion.div>

      {extendCampaign && (
        <ExtendCampaignModal campaign={extendCampaign} onClose={() => setExtendCampaign(null)} />
      )}
    </div>
  );
}
