import { buildCampaignUrl } from '../utils/sharing';
import CopyLinkButton from './CopyLinkButton';
import ShareButtons from './ShareButtons';
import QRCodeCard from './QRCodeCard';
import CampaignStats from './CampaignStats';
import { useCampaignAnalytics } from '../hooks/useCampaignAnalytics';

export default function ShareCampaignSection({ campaign }) {
  const { stats } = useCampaignAnalytics(campaign.id);
  const url = buildCampaignUrl(campaign.slug);

  return (
    <section className="glass-card space-y-6 mt-8">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Share Official Campaign</h2>
        <p className="text-sm text-gray-500">
          Distribute your official campaign page across WhatsApp, Facebook, posters, flyers, and other
          campaign materials. One official campaign link — the public source for your campaign information.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start">
        <CopyLinkButton
          url={url}
          campaignId={campaign.id}
          label="Copy Official Campaign Link"
          className="w-full sm:w-auto"
        />
        <div className="flex-1 w-full min-w-0">
          <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">Official campaign link</p>
          <div className="w-full px-4 py-2.5 bg-surface-elevated/80 rounded-xl border border-surface-border text-sm text-gray-400 truncate">
            {url}
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">Distribute on social</p>
        <ShareButtons campaign={campaign} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <QRCodeCard slug={campaign.slug} title={campaign.title} campaignId={campaign.id} />
        <div>
          <p className="text-xs text-gray-500 mb-3 uppercase tracking-wide">Public page activity</p>
          <CampaignStats stats={stats} campaign={campaign} />
          <p className="text-xs text-gray-600 mt-4">
            Views and shares on this official campaign page
          </p>
        </div>
      </div>
    </section>
  );
}
