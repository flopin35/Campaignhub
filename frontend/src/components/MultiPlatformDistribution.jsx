import { useState } from 'react';
import { motion } from 'framer-motion';
import { aiService } from '../services/aiService';
import { useToast } from '../context/ToastContext';
import { hasMultiPlatform } from '../utils/featureAccess';
import { Link } from 'react-router-dom';
import { Share2, Copy, Lock } from 'lucide-react';

const PLATFORMS = [
  { id: 'whatsapp', label: 'WhatsApp', color: 'text-emerald-400' },
  { id: 'facebook', label: 'Facebook', color: 'text-blue-400' },
  { id: 'instagram', label: 'Instagram', color: 'text-pink-400' },
  { id: 'tiktok', label: 'TikTok', color: 'text-white' },
];

export default function MultiPlatformDistribution({ campaign }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(null);
  const [formats, setFormats] = useState({});

  const unlocked = hasMultiPlatform(campaign);

  const generate = async (platform) => {
    if (!unlocked) return;
    setLoading(platform);
    try {
      const res = await aiService.ask(
        `Create a ready-to-post ${platform} campaign post for "${campaign.title}". Category: ${campaign.category}. Include emoji where appropriate. Format: hook line, body, call-to-action, and 3 hashtags. Keep it concise for ${platform}.`,
        { platform, campaignTitle: campaign.title, category: campaign.category },
        'distribution'
      );
      setFormats((prev) => ({ ...prev, [platform]: res.reply }));
      toast(`${platform} format ready`, 'success');
    } catch (err) {
      toast(err.message || 'Could not generate format', 'warning');
    } finally {
      setLoading(null);
    }
  };

  const copy = async (text) => {
    await navigator.clipboard.writeText(text);
    toast('Copied to clipboard', 'success');
  };

  if (!unlocked) {
    return (
      <div className="glass-card p-6 text-center">
        <Lock className="w-8 h-8 text-gray-500 mx-auto mb-3" />
        <h3 className="font-semibold text-white mb-2">Multi-Platform Distribution</h3>
        <p className="text-sm text-gray-500 mb-4">
          Generate optimized posts for WhatsApp, Facebook, Instagram, and TikTok from one campaign.
        </p>
        <Link to={`/campaign/${campaign.slug}/performance`} className="btn-primary text-sm inline-flex items-center gap-2">
          <Share2 className="w-4 h-4" />
          Upgrade to unlock
        </Link>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 space-y-5">
      <div>
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Share2 className="w-5 h-5 text-brand-400" />
          Multi-Platform Distribution
        </h3>
        <p className="text-xs text-gray-500 mt-1">One campaign → ready-to-share formats for every platform.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => generate(p.id)}
            disabled={!!loading}
            className="text-left p-4 rounded-xl bg-surface-elevated border border-surface-border hover:border-brand-500/30 transition-colors disabled:opacity-50"
          >
            <span className={`text-sm font-medium ${p.color}`}>{p.label}</span>
            <p className="text-xs text-gray-500 mt-1">{loading === p.id ? 'Generating…' : formats[p.id] ? 'Regenerate format' : 'Generate format'}</p>
          </button>
        ))}
      </div>

      {Object.entries(formats).map(([platform, text]) => (
        <motion.div key={platform} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-surface-elevated rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-400 uppercase">{platform}</span>
            <button type="button" onClick={() => copy(text)} className="text-xs text-brand-400 inline-flex items-center gap-1">
              <Copy className="w-3 h-3" /> Copy
            </button>
          </div>
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{text}</p>
        </motion.div>
      ))}
    </div>
  );
}
