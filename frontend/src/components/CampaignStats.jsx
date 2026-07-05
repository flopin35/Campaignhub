export default function CampaignStats({ stats, campaign }) {
  if (!stats && !campaign) return null;

  const waVisits = stats?.whatsappVisits ?? 0;
  const waShares = stats?.whatsappShares ?? 0;

  const items = [
    { label: 'Views', value: stats?.totalViews ?? campaign?.views ?? 0 },
    { label: 'WA visits', value: waVisits, hint: 'Clicked your link from WhatsApp' },
    { label: 'WA shares', value: waShares, hint: 'Share button clicks' },
    { label: 'Leads', value: stats?.leadSignups ?? 0, accent: 'text-emerald-400' },
    { label: 'CTA clicks', value: stats?.ctaClicks ?? campaign?.clicks ?? 0 },
    { label: 'QR Scans', value: stats?.qrScans ?? 0 },
    { label: 'Link Copies', value: stats?.linkCopies ?? 0 },
    { label: 'Facebook', value: stats?.facebookVisits ?? stats?.facebookShares ?? 0 },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((item) => (
        <div key={item.label} className="bg-surface-elevated/60 rounded-xl p-3 text-center border border-surface-border/50" title={item.hint}>
          <div className={`text-lg font-bold ${item.accent || 'text-white'}`}>{item.value.toLocaleString()}</div>
          <div className="text-[10px] text-gray-500">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
