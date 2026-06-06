import axios from 'axios';
import api from './api';

const AI_DIRECT_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000';

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
  ask: async (message, context = {}, type = 'assistant') => {
    try {
      const res = await api.post('/ask-ai', { message, context, type });
      const reply = parseAiReply(res.data);
      if (!reply) throw new Error('No AI response received');
      const meta = res.data?.data || res.data || {};
      return {
        reply,
        mode: meta.mode,
        providers: meta.providers || [],
        fallback: meta.fallback || meta.mode === 'fallback',
      };
    } catch (err) {
      // Dev fallback: call AI service directly if Express backend is down
      if (import.meta.env.DEV) {
        try {
          return await callAiDirect(message, context, type);
        } catch {
          // fall through
        }
      }
      throw err;
    }
  },

  getRecommendations: (campaigns, preferences = {}) =>
    api.post('/recommendations', { campaigns, preferences }).then((r) => r.data),
};

export default aiService;
