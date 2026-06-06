export default function AnalyticsWidget({ stats }) {
  if (!stats) return null;

  const items = [
    { label: 'Active', value: stats.active, color: 'text-emerald-400' },
    { label: 'Pending', value: stats.pending, color: 'text-amber-400' },
    { label: 'Total Views', value: stats.totalViews?.toLocaleString() || '0', color: 'text-brand-400' },
    { label: 'Shares', value: stats.totalShares?.toLocaleString() || '0', color: 'text-blue-400' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <div key={item.label} className="card text-center py-4">
          <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
          <div className="text-xs text-gray-500 mt-1">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
