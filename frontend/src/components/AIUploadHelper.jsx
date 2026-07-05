import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { usePremiumModal } from '../context/PremiumModalContext';
import { aiService } from '../services/aiService';
import { canUseFullAi, canUseBasicAiCaption } from '../utils/featureAccess';
import { buildCampaignUrl } from '../utils/sharing';
import { Sparkles, Lock } from './icons/AppIcons';
import { Copy } from 'lucide-react';

export default function AIUploadHelper({ form, onApply, campaign = null }) {
  const { toast } = useToast();
  const { openPremiumModal } = usePremiumModal();
  const [loading, setLoading] = useState(null);
  const [toneVariants, setToneVariants] = useState(null);
  const isUploadFlow = !campaign;
  const fullAi = campaign ? canUseFullAi(campaign) : false;

  const ask = async (type, prompt, premiumOnly = false) => {
    if (premiumOnly && !fullAi) {
      toast('Upgrade to AI Campaign Assistant for this feature', 'warning');
      return;
    }
    setLoading(type);
    try {
      const res = await aiService.ask(
        prompt,
        { category: form.category, type, title: form.title, campaignType: form.campaignType },
        'presentation'
      );
      const text = res.reply || '';
      if (!text) throw new Error('No suggestion received');
      if (res.fallback || res.mode === 'fallback') {
        toast('AI is offline — using a basic suggestion. Try again in a moment.', 'warning');
      }
      onApply(type, text.trim());
      toast(
        type === 'caption' ? 'Caption added to description' : 'AI suggestion applied',
        'success'
      );
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
      prompt: `Write one short social media caption for a ${form.campaignType || 'Awareness'} ${form.category || 'General'} campaign${form.title ? ` titled "${form.title}"` : ''}. Max 2 sentences. Ready to post.`,
    },
    ...(isUploadFlow
      ? [
          {
            id: 'title',
            label: 'Title ideas',
            premium: false,
            prompt: `Suggest one catchy campaign title for a ${form.category || 'General'} campaign. Return only the title, max 8 words.`,
          },
          {
            id: 'description',
            label: 'Description',
            premium: false,
            prompt: `Write a compelling 2-3 sentence campaign description for a ${form.category || 'General'} campaign${form.title ? ` titled "${form.title}"` : ''}. Professional and engaging.`,
          },
        ]
      : []),
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

  const generateToneVariants = async () => {
    if (!fullAi) {
      toast('Upgrade for multi-style captions', 'warning');
      return;
    }
    setLoading('tones');
    setToneVariants(null);
    try {
      const res = await aiService.ask(
        `For a ${form.category || 'General'} campaign${form.title ? ` "${form.title}"` : ''}, write 3 short social media captions for Ghana. Label each clearly:
FORMAL: (professional, trustworthy)
GENZ: (youthful, emoji, trendy)
STREET: (local Ghanaian slang, relatable, Twi-English mix OK)
Each max 3 sentences. Include a call-to-action.`,
        { category: form.category, title: form.title },
        'presentation',
      );
      const text = res.reply || '';
      const formal = text.match(/FORMAL:?\s*([\s\S]*?)(?=GENZ:|STREET:|$)/i)?.[1]?.trim();
      const genz = text.match(/GENZ:?\s*([\s\S]*?)(?=STREET:|FORMAL:|$)/i)?.[1]?.trim();
      const street = text.match(/STREET:?\s*([\s\S]*?)$/i)?.[1]?.trim();
      setToneVariants({
        formal: formal || text.split('\n')[0],
        genz: genz || text.split('\n')[1] || text,
        street: street || text.split('\n')[2] || text,
      });
      toast('3 caption styles ready — pick one', 'success');
    } catch (err) {
      toast(err.message || 'Could not generate variants', 'warning');
    } finally {
      setLoading(null);
    }
  };

  const copyVariant = async (label, text) => {
    const link = campaign?.slug ? `\n\n${buildCampaignUrl(campaign.slug, 'whatsapp')}` : '';
    await navigator.clipboard.writeText(`${text.trim()}${link}`);
    toast(`${label} caption copied`, 'success');
  };

  const actions = [...freeActions, ...premiumActions];

  return (
    <div className="p-4 rounded-xl bg-brand-600/5 border border-brand-500/20 space-y-3">
      <p className="text-sm font-medium text-brand-400 inline-flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        AI Campaign Assistant
      </p>
      <p className="text-xs text-gray-500">
        {fullAi
          ? 'Full AI message support — slogans, hashtags, CTAs, and more.'
          : isUploadFlow
            ? 'Caption, title, and description helpers are free during upload. Upgrade later for hashtags, CTAs, and more.'
            : 'Basic caption is free. Upgrade for full AI message support on your campaign pages.'}
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

      {fullAi && (
        <button
          type="button"
          onClick={generateToneVariants}
          disabled={!!loading}
          className="text-xs py-2 px-3 rounded-lg border border-brand-500/30 bg-brand-600/10 text-brand-300 hover:bg-brand-600/20 w-full sm:w-auto"
        >
          {loading === 'tones' ? 'Generating 3 styles…' : '✨ Gen Z · Formal · Street slang versions'}
        </button>
      )}

      {toneVariants && (
        <div className="space-y-2 pt-2 border-t border-surface-border/60">
          {[
            { key: 'formal', label: 'Formal' },
            { key: 'genz', label: 'Gen Z' },
            { key: 'street', label: 'Street / local' },
          ].map(({ key, label }) => (
            <div key={key} className="rounded-lg bg-surface-elevated p-3 text-left">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-semibold uppercase text-gray-500">{label}</span>
                <button
                  type="button"
                  onClick={() => copyVariant(label, toneVariants[key])}
                  className="text-[10px] text-brand-400 inline-flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
              <p className="text-xs text-gray-300 whitespace-pre-wrap">{toneVariants[key]}</p>
            </div>
          ))}
        </div>
      )}

      {!fullAi && campaign?.slug && (
        <button
          type="button"
          onClick={() => openPremiumModal({ campaign })}
          className="text-xs text-brand-400 hover:underline inline-block"
        >
          Unlock full AI assistant →
        </button>
      )}
    </div>
  );
}
