import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { aiService } from '../services/aiService';
import { Sparkles } from './icons/AppIcons';

export default function AIUploadHelper({ form, onApply }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(null);

  const ask = async (type, prompt) => {
    setLoading(type);
    try {
      const res = await aiService.ask(prompt, { category: form.category, type }, 'assistant');
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

  const actions = [
    {
      id: 'title',
      label: 'Title ideas',
      prompt: `Suggest 3 catchy campaign titles for a ${form.category || 'General'} campaign. Return only the best single title, max 8 words.`,
    },
    {
      id: 'slogan',
      label: 'Slogan',
      prompt: `Write a short powerful campaign slogan for a ${form.category || 'General'} campaign. One line only.`,
    },
    {
      id: 'description',
      label: 'Description helper',
      prompt: `Write a compelling 2-3 sentence campaign description for a ${form.category || 'General'} campaign. Professional and engaging.`,
    },
    {
      id: 'tips',
      label: 'Engagement tips',
      prompt: 'Give 3 brief tips to increase campaign engagement on a digital platform. Bullet points, max 3 lines total.',
    },
  ];

  return (
    <div className="p-4 rounded-xl bg-brand-600/5 border border-brand-500/20 space-y-3">
      <p className="text-sm font-medium text-brand-400 inline-flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        AI Campaign Assistant
      </p>
      <p className="text-xs text-gray-500">Lightweight suggestions for title, slogan, description & engagement.</p>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => ask(a.id, a.prompt)}
            disabled={!!loading}
            className="text-xs py-1.5 px-3 rounded-lg bg-surface-elevated hover:bg-brand-600/20 text-gray-400 hover:text-brand-400 border border-surface-border transition-colors disabled:opacity-50"
          >
            {loading === a.id ? '...' : a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
