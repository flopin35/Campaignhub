import { SharePlatformIcon } from './icons/AppIcons';
import { useToast } from '../context/ToastContext';
import { trackPlatformShare } from '../services/analyticsService';
import { SHARE_PLATFORMS, getShareUrl } from '../utils/sharing';

export default function ShareButtons({ campaign, compact = false }) {
  const { toast } = useToast();

  const share = async (platform) => {
    const shareUrl = getShareUrl(platform, campaign.slug, campaign.title);
    trackPlatformShare(campaign.id, platform).catch(console.error);
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=500');
    toast(`Shared via ${platform.charAt(0).toUpperCase() + platform.slice(1)}`, 'success');
  };

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? '' : 'justify-start'}`}>
      {SHARE_PLATFORMS.map((p) => (
        <button
          key={p.id}
          onClick={() => share(p.id)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border border-surface-border bg-surface-elevated/80 transition-all duration-200 ${p.color}`}
        >
          <SharePlatformIcon platform={p.id} className="w-4 h-4" />
          {!compact && <span>{p.label}</span>}
        </button>
      ))}
    </div>
  );
}
