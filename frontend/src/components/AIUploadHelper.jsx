import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { aiService } from '../services/aiService';
import { canUseFullAi, canUseBasicAiCaption } from '../utils/featureAccess';
import { Sparkles, Lock } from './icons/AppIcons';

export default function AIUploadHelper({ form, onApply, campaign = null }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(null);
  const fullAi = campaign ? canUseFullAi(campaign) : false;

  const ask = async (type, prompt, premiumOnly = false) => {
    if (premiumOnly && !fullAi) {
      toast('Upgrade to AI Campaign Assistant for this feature', 'warning');
      return;
    }
    setLoading(type);
    try {
      const res = await aiService.ask(prompt, { category: form.category, type }, 'presentation');
      const text = res.reply || '';
      if (!text) throw new Error('No suggestion received');
      onApply(type, text.trim());
      toast('AI suggestion applied', 'success');
    } catch (err) {
      toast(err.message || 'AI unavailable — try again later', 'warning');
    } finally {
      setLoading(null);
    }
  };

  const freeActions = [
    {
      id: 'caption',
      label: 'Basic caption',
      premium: false,
      prompt: `Write one short social media caption for a ${form.category || 'General'} campaign. Max 2 sentences.`,
    },
  ];

  const premiumActions = [
    {
      id: 'title',
      label: 'Title ideas',
      premium: true,
      prompt: `Suggest 3 catchy campaign titles for a ${form.category || 'General'} campaign. Return only the best single title, max 8 words.`,
    },
    {
      id: 'slogan',
      label: 'Slogan',
      premium: true,
      prompt: `Write a short powerful campaign slogan for a ${form.category || 'General'} campaign. One line only.`,
    },
    {
      id: 'description',
      label: 'Description',
      premium: true,
      prompt: `Write a compelling 2-3 sentence campaign description for a ${form.category || 'General'} campaign. Professional and engaging.`,
    },
    {
      id: 'hashtags',
      label: 'Hashtags',
      premium: true,
      prompt: `Suggest 5 relevant hashtags for a ${form.category || 'General'} campaign in Ghana. Return as a single line.`,
    },
    {
      id: 'cta',
      label: 'Call-to-action',
      premium: true,
      prompt: `Write a strong call-to-action for a ${form.category || 'General'} campaign. One line, action-oriented.`,
    },
    {
      id: 'tips',
      label: 'Posting ideas',
      premium: true,
      prompt: 'Give 3 brief social media posting ideas for a campaign. Bullet points, max 3 lines total.',
    },
  ];

  const actions = [...freeActions, ...premiumActions];

  return (
    <div className="p-4 rounded-xl bg-brand-600/5 border border-brand-500/20 space-y-3">
      <p className="text-sm font-medium text-brand-400 inline-flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        AI Campaign Assistant
      </p>
      <p className="text-xs text-gray-500">
        {fullAi
          ? 'Full AI marketing support — slogans, hashtags, CTAs, and more.'
          : 'Basic caption is free. Upgrade for full AI marketing support on your dashboard.'}
      </p>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => {
          const locked = a.premium && !fullAi;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => ask(a.id, a.prompt, a.premium)}
              disabled={!!loading || (a.premium && !fullAi && !canUseBasicAiCaption())}
              className={`text-xs py-1.5 px-3 rounded-lg border transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 ${
                locked
                  ? 'bg-surface-elevated text-gray-500 border-surface-border'
                  : 'bg-surface-elevated hover:bg-brand-600/20 text-gray-400 hover:text-brand-400 border-surface-border'
              }`}
            >
              {locked && <Lock className="w-3 h-3" />}
              {loading === a.id ? '...' : a.label}
            </button>
          );
        })}
      </div>
      {!fullAi && campaign?.slug && (
        <Link to={`/campaign/${campaign.slug}/performance`} className="text-xs text-brand-400 hover:underline inline-block">
          Unlock full AI assistant →
        </Link>
      )}
    </div>
  );
}
