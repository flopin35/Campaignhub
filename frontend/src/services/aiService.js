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
