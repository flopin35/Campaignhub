import { useCampaignAnalytics } from '../hooks/useCampaignAnalytics';
import CampaignStats from './CampaignStats';
import { hasAdvancedAnalytics } from '../utils/featureAccess';
import { TrendingUp, Minus } from 'lucide-react';
import PremiumGate from './PremiumGate';

function BarChart({ items }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">{item.label}</span>
            <span className="text-gray-300">{item.value.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-600 rounded-full transition-all duration-500"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function AdvancedInsights({ campaign, stats, views, shares, engagementRate }) {
  const clickThrough = views > 0 ? (((stats?.linkCopies ?? 0) + (stats?.qrScans ?? 0)) / views * 100).toFixed(1) : '0';
  const topSource = [
    { label: 'Direct', value: stats?.directVisits ?? 0 },
    { label: 'QR', value: stats?.qrScans ?? 0 },
    { label: 'WhatsApp', value: stats?.whatsappVisits ?? stats?.whatsappShares ?? 0 },
    { label: 'Facebook', value: stats?.facebookShares ?? 0 },
  ].sort((a, b) => b.value - a.value)[0];

  return (
    <div className="glass-card border-brand-500/20 p-6 space-y-5">
      <h3 className="text-sm font-medium text-brand-400 uppercase tracking-wide flex items-center gap-2">
        <TrendingUp className="w-4 h-4" />
        Advanced page insights
      </h3>
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-surface-elevated rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{clickThrough}%</p>
          <p className="text-xs text-gray-500 mt-1">Link &amp; QR response</p>
        </div>
        <div className="bg-surface-elevated rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-brand-400">{engagementRate}%</p>
          <p className="text-xs text-gray-500 mt-1">Page activity rate</p>
        </div>
        <div className="bg-surface-elevated rounded-xl p-4 text-center">
          <p className="text-lg font-bold text-emerald-400 truncate">{topSource?.label || '—'}</p>
          <p className="text-xs text-gray-500 mt-1">Top traffic source</p>
        </div>
      </div>
      <p className="text-xs text-gray-500">
        Page activity breakdown for {campaign?.title} — based on live analytics.
      </p>
    </div>
  );
}

function PremiumAnalyticsUpsell({ campaign }) {
  return (
    <PremiumGate
      campaign={campaign}
      feature="analytics"
      title="Unlock detailed page analytics"
      description="See where visitors come from, which channels drive traffic, and detailed page activity breakdowns."
    />
  );
}

export default function AnalyticsDashboard({ campaign, stats: externalStats }) {
  const { stats: liveStats } = useCampaignAnalytics(campaign?.id);
  const stats = liveStats || externalStats;
  const advanced = hasAdvancedAnalytics(campaign);

  const views = stats?.totalViews ?? campaign?.views ?? 0;
  const outboundShares = (stats?.whatsappShares ?? 0) + (stats?.facebookShares ?? 0) + (stats?.twitterShares ?? 0)
    + (stats?.telegramShares ?? 0) + (stats?.linkedinShares ?? 0);
  const inboundWa = stats?.whatsappVisits ?? 0;
  const leads = stats?.leadSignups ?? 0;
  const ctaClicks = stats?.ctaClicks ?? campaign?.clicks ?? 0;
  const engagementRate = views > 0
    ? ((leads + ctaClicks + (stats?.linkCopies ?? 0)) / views * 100).toFixed(1)
    : '0';

  const trafficSources = [
    { label: 'Direct visits', value: stats?.directVisits ?? 0 },
    { label: 'WhatsApp traffic', value: inboundWa },
    { label: 'QR scans', value: stats?.qrScans ?? 0 },
    { label: 'Facebook', value: stats?.facebookVisits ?? stats?.facebookShares ?? 0 },
    { label: 'Instagram / TikTok', value: (stats?.instagramVisits ?? 0) + (stats?.tiktokVisits ?? 0) },
  ];

  const engagement = [
    { label: 'Views', value: views },
    { label: 'Supporter sign-ups', value: leads },
    { label: 'Page actions', value: ctaClicks },
    { label: 'Share clicks', value: outboundShares },
    { label: 'Supporters', value: campaign?.followerCount ?? 0 },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="stat-card">
          <div className="text-xl sm:text-2xl font-bold text-white">{views.toLocaleString()}</div>
          <div className="text-[10px] sm:text-xs text-gray-500 mt-1">Views</div>
        </div>
        <div className="stat-card">
          <div className="text-xl sm:text-2xl font-bold text-emerald-400">{leads.toLocaleString()}</div>
          <div className="text-[10px] sm:text-xs text-gray-500 mt-1">Sign-ups</div>
        </div>
        <div className="stat-card">
          <div className="text-xl sm:text-2xl font-bold text-brand-400">{inboundWa.toLocaleString()}</div>
          <div className="text-[10px] sm:text-xs text-gray-500 mt-1">WA traffic</div>
        </div>
        <div className="stat-card">
          <div className="text-xl sm:text-2xl font-bold text-emerald-400">{stats?.qrScans ?? 0}</div>
          <div className="text-[10px] sm:text-xs text-gray-500 mt-1">QR Scans</div>
        </div>
        {advanced && (
          <div className="stat-card col-span-2 sm:col-span-1">
            <div className="text-xl sm:text-2xl font-bold text-amber-400">{engagementRate}%</div>
            <div className="text-[10px] sm:text-xs text-gray-500 mt-1 flex items-center justify-center gap-1">
              Page activity
              {views === 0 && <Minus className="w-3 h-3 text-gray-600" title="No data yet" />}
            </div>
          </div>
        )}
      </div>

      {advanced ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="glass-card">
              <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wide">Traffic Sources</h3>
              <BarChart items={trafficSources} />
            </div>
            <div className="glass-card">
              <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wide">Page activity</h3>
              <BarChart items={engagement} />
            </div>
          </div>

          <AdvancedInsights campaign={campaign} stats={stats} views={views} shares={outboundShares} engagementRate={engagementRate} />

          <div className="glass-card">
            <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wide">Detailed Stats</h3>
            <CampaignStats stats={stats} campaign={campaign} />
            <p className="text-xs text-gray-600 mt-4">Live data from Firebase · updates in real time</p>
          </div>
        </>
      ) : (
        <PremiumAnalyticsUpsell campaign={campaign} />
      )}
    </div>
  );
}
