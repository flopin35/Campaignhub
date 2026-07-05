import { useState } from 'react';
import { SharePlatformIcon } from './icons/AppIcons';
import { useToast } from '../context/ToastContext';
import { trackPlatformShare } from '../services/analyticsService';
import {
  SHARE_PLATFORMS,
  COPY_PLATFORMS,
  getShareUrl,
  getCopyPack,
  nativeShare,
} from '../utils/sharing';

export default function ShareButtons({ campaign, compact = false }) {
  const { toast } = useToast();
  const [sharing, setSharing] = useState(false);

  const share = async (platform) => {
    const shareUrl = getShareUrl(platform, campaign.slug, campaign.title);
    trackPlatformShare(campaign.id, platform).catch(console.error);

    if (platform === 'sms' || platform === 'email') {
      window.location.href = shareUrl;
    } else {
      window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=500');
    }
    toast(`Opened ${platform}`, 'success');
  };

  const copyFor = async (platform) => {
    const pack = getCopyPack(campaign.slug, campaign.title, campaign.description);
    const text = pack[platform] || buildCopyFallback(platform);
    await navigator.clipboard.writeText(text);
    trackPlatformShare(campaign.id, platform).catch(console.error);
    toast(`${platform} copy ready — paste in app`, 'success');
  };

  const buildCopyFallback = (platform) => {
    const url = `${window.location.origin}/campaign/${campaign.slug}?ref=${platform}`;
    return `${campaign.title}\n${url}`;
  };

  const shareWhatsApp = () => share('whatsapp');

  const shareNative = async () => {
    setSharing(true);
    try {
      const ok = await nativeShare({ title: campaign.title, slug: campaign.slug });
      if (ok) {
        trackPlatformShare(campaign.id, 'whatsapp').catch(console.error);
        toast('Shared!', 'success');
      } else {
        shareWhatsApp();
      }
    } catch {
      shareWhatsApp();
    } finally {
      setSharing(false);
    }
  };

  const otherPlatforms = SHARE_PLATFORMS.filter((p) => p.id !== 'whatsapp');

  return (
    <div className="space-y-3">
      {/* WhatsApp-first — Ghana sales engine */}
      <button
        type="button"
        onClick={shareNative}
        disabled={sharing}
        className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 min-h-[52px] rounded-xl text-base font-semibold border border-emerald-500/40 bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 transition-all touch-manipulation"
      >
        <SharePlatformIcon platform="whatsapp" className="w-5 h-5" />
        Share on WhatsApp
      </button>

      <div className={`flex flex-wrap gap-2 ${compact ? '' : 'justify-start'}`}>
        {otherPlatforms.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => share(p.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-xl text-sm font-medium border border-surface-border bg-surface-elevated/80 transition-all touch-manipulation ${p.color}`}
          >
            <SharePlatformIcon platform={p.id} className="w-4 h-4" />
            {!compact && <span>{p.label}</span>}
          </button>
        ))}
      </div>

      <div>
        <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-2">Copy for paste</p>
        <div className="flex flex-wrap gap-2">
          {COPY_PLATFORMS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => (p.id === 'sms' || p.id === 'email' ? share(p.id) : copyFor(p.id))}
              className="text-xs px-3 py-2 min-h-[40px] rounded-lg border border-surface-border bg-surface-elevated/60 text-gray-400 hover:text-white hover:border-brand-500/30 touch-manipulation"
              title={p.hint}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
