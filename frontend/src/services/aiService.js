import axios from 'axios';
import api from './api';

const AI_DIRECT_URL = import.meta.env.VITE_AI_SERVICE_URL || '';

const GEMINI_TYPES = new Set(['presentation', 'caption', 'content', 'distribution']);
const OPENAI_TYPES = new Set(['dashboard', 'analytics', 'management', 'guidance']);

/** Resolve AI provider from type + page context */
export function resolveAiType(explicitType, context = {}) {
  if (explicitType && explicitType !== 'assistant') return explicitType;

  const page = context.page || '';
  if (page.startsWith('/dashboard') || page.startsWith('/admin') || page.includes('/performance')) {
    return 'dashboard';
  }
  if (page.includes('/upload')) return 'presentation';
  return explicitType || 'presentation';
}

export function isDashboardAi(type) {
  return OPENAI_TYPES.has(type) || type === 'dashboard';
}

export function isPresentationAi(type) {
  return GEMINI_TYPES.has(type) || type === 'presentation';
}

/** Extract reply text from backend or AI service response shapes */
export function parseAiReply(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  return (
    payload.data?.reply ||
    payload.reply ||
    payload.response ||
    payload.answer ||
    payload.message ||
    ''
  );
}

async function callAiDirect(message, context, type) {
  if (!AI_DIRECT_URL) throw new Error('AI service URL not configured');
  const res = await axios.post(
    `${AI_DIRECT_URL}/api/ai/chat`,
    { message, context, type },
    { timeout: 45000, headers: { 'Content-Type': 'application/json' } }
  );
  const reply = parseAiReply(res.data);
  if (!reply) throw new Error('No AI response received');
  return {
    reply,
    mode: res.data.mode,
    providers: res.data.providers || [],
    fallback: res.data.mode === 'fallback',
  };
}

export const aiService = {
  /** Presentation content — routes to Gemini */
  generatePresentation: (message, context = {}) =>
    aiService.ask(message, context, 'presentation'),

  /** Dashboard management — routes to OpenAI */
  askDashboard: (message, context = {}) =>
    aiService.ask(message, context, 'dashboard'),

  ask: async (message, context = {}, type = 'assistant') => {
    const resolvedType = resolveAiType(type, context);
    try {
      const res = await api.post('/ask-ai', { message, context, type: resolvedType });
      const reply = parseAiReply(res.data);
      if (!reply) throw new Error('No AI response received');
      const meta = res.data?.data || res.data || {};
      return {
        reply,
        mode: meta.mode,
        providers: meta.providers || [],
        fallback: meta.fallback || meta.mode === 'fallback',
        aiType: resolvedType,
      };
    } catch (err) {
      if (AI_DIRECT_URL) {
        try {
          return { ...(await callAiDirect(message, context, resolvedType)), aiType: resolvedType };
        } catch {
          /* fall through */
        }
      }
      throw err;
    }
  },

  getRecommendations: (campaigns, preferences = {}) =>
    api.post('/recommendations', { campaigns, preferences }).then((r) => r.data),
};

export default aiService;

export const STUDIO_TASKS = [
  { id: 'speech', label: 'Rally speech', hint: 'Who is the audience and what do they care about? e.g. "Market women at Kaneshie, worried about rent and sanitation."' },
  { id: 'social', label: 'Social posts', hint: 'What happened or what do you want people to do? e.g. "Thank everyone who came to the Madina rally; invite them to Saturday\'s clean-up."' },
  { id: 'ad', label: 'Ad copy & radio script', hint: 'What is the ad promoting and to whom? e.g. "Youth jobs plan — 18–35 year olds in Tema West."' },
  { id: 'sms', label: 'SMS / WhatsApp', hint: 'What should supporters do? e.g. "Remind supporters to check their names on the voter register this week."' },
  { id: 'doorstep', label: 'Canvassing script', hint: 'Key message for volunteers going door to door.' },
  { id: 'statement', label: 'Press statement', hint: 'What claim or event must you respond to? Give the facts.' },
  { id: 'manifesto', label: 'Manifesto summary', hint: 'Paste your policy notes or bullet points.' },
  { id: 'slogan', label: 'Slogans', hint: 'Your core promise in a sentence.' },
  { id: 'strategy', label: 'Strategy advisor', hint: 'Describe your situation: days left, voter numbers, strong/weak areas, budget.' },
];

export const STUDIO_LANGUAGES = ['English', 'Twi', 'Fante', 'Ga', 'Ewe', 'Hausa', 'Dagbani', 'Pidgin'];
export const STUDIO_TONES = ['Inspiring', 'Warm & personal', 'Energetic', 'Calm & factual', 'Urgent', 'Humble'];

/** CampaignHub Pro AI Studio (server checks ownership + subscription). */
export async function generateStudioDraft({ campaignId, task, prompt, language, tone }) {
  const res = await api.post('/ai-studio', { campaignId, task, prompt, language, tone }, { timeout: 60000 });
  if (!res.data?.success) throw new Error(res.data?.message || 'AI request failed');
  return res.data.data;
}
