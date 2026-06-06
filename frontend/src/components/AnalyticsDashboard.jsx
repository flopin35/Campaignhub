import { useCampaignAnalytics } from '../hooks/useCampaignAnalytics';
import CampaignStats from './CampaignStats';

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

export default function AnalyticsDashboard({ campaign, stats: externalStats }) {
  const { stats: liveStats } = useCampaignAnalytics(campaign?.id);
  const stats = liveStats || externalStats;

  const views = stats?.totalViews ?? campaign?.views ?? 0;
  const shares = (stats?.whatsappShares ?? 0) + (stats?.facebookShares ?? 0) + (stats?.twitterShares ?? 0)
    + (stats?.telegramShares ?? 0) + (stats?.linkedinShares ?? 0);
  const engagementRate = views > 0
    ? (((stats?.linkCopies ?? 0) + shares + (stats?.qrScans ?? 0)) / views * 100).toFixed(1)
    : '0';

  const trafficSources = [
    { label: 'Direct visits', value: stats?.directVisits ?? 0 },
    { label: 'QR scans', value: stats?.qrScans ?? 0 },
    { label: 'WhatsApp', value: stats?.whatsappShares ?? 0 },
    { label: 'Facebook', value: stats?.facebookShares ?? 0 },
    { label: 'Other social', value: (stats?.twitterShares ?? 0) + (stats?.telegramShares ?? 0) + (stats?.linkedinShares ?? 0) },
  ];

  const engagement = [
    { label: 'Views', value: views },
    { label: 'Shares', value: shares },
    { label: 'Link copies', value: stats?.linkCopies ?? 0 },
    { label: 'Supporters', value: campaign?.followerCount ?? 0 },
    { label: 'Comments', value: campaign?.commentCount ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-white">{views.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">Total Views</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-brand-400">{shares.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">Shares</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-emerald-400">{stats?.qrScans ?? 0}</div>
          <div className="text-xs text-gray-500 mt-1">QR Scans</div>
        </div>
        <div className="card text-center py-4">
          <div className="text-2xl font-bold text-amber-400">{engagementRate}%</div>
          <div className="text-xs text-gray-500 mt-1">Engagement Rate</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card">
          <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wide">Traffic Sources</h3>
          <BarChart items={trafficSources} />
        </div>
        <div className="glass-card">
          <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wide">Engagement</h3>
          <BarChart items={engagement} />
        </div>
      </div>

      <div className="glass-card">
        <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wide">Detailed Stats</h3>
        <CampaignStats stats={stats} campaign={campaign} />
        <p className="text-xs text-gray-600 mt-4">Live data from Firebase · updates in real time</p>
      </div>
    </div>
  );
}
