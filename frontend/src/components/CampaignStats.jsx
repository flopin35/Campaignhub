export default function CampaignStats({ stats, campaign }) {
  if (!stats && !campaign) return null;

  const items = [
    { label: 'Views', value: stats?.totalViews ?? campaign?.views ?? 0 },
    { label: 'QR Scans', value: stats?.qrScans ?? 0 },
    { label: 'Link Copies', value: stats?.linkCopies ?? 0 },
    { label: 'WhatsApp', value: stats?.whatsappShares ?? 0 },
    { label: 'Facebook', value: stats?.facebookShares ?? 0 },
    { label: 'Shares', value: (stats?.twitterShares ?? 0) + (stats?.telegramShares ?? 0) + (stats?.linkedinShares ?? 0) },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map((item) => (
        <div key={item.label} className="bg-surface-elevated/60 rounded-xl p-3 text-center border border-surface-border/50">
          <div className="text-lg font-bold text-white">{item.value.toLocaleString()}</div>
          <div className="text-xs text-gray-500">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
