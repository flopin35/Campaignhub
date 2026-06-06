export default function CampaignSkeleton({ count = 3 }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-0 overflow-hidden animate-pulse">
          <div className="aspect-[16/9] bg-surface-elevated" />
          <div className="p-5 space-y-3">
            <div className="h-4 bg-surface-elevated rounded w-1/4" />
            <div className="h-5 bg-surface-elevated rounded w-3/4" />
            <div className="h-4 bg-surface-elevated rounded w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
