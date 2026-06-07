/** Split AI: Gemini = presentation, OpenAI = dashboard */

const GEMINI_TYPES = new Set(['presentation', 'caption', 'content', 'distribution']);
const OPENAI_TYPES = new Set(['dashboard', 'analytics', 'management', 'guidance']);

const GEMINI_SYSTEM = `You are CampaignHub Gemini — specialist in campaign presentation and marketing content for Ghana.
Generate catchy titles, slogans, captions, hashtags, CTAs, and platform-ready post copy.
Be creative, concise, and professional. Write ready-to-use content.`;

const OPENAI_SYSTEM = `You are CampaignHub Dashboard AI — specialist in campaign management, analytics, and operations.
Help users understand dashboard data, improve campaign performance, and manage active campaigns.
Be practical, data-minded, and concise. Focus on actionable next steps.`;

const OFFLINE_REPLY =
  "I'm temporarily offline. Visit Upload to create a campaign, or browse /campaigns for live campaigns.";

function resolveProvider(type, context = {}) {
  const chatType = (type || 'assistant').toLowerCase();
  if (GEMINI_TYPES.has(chatType)) return 'gemini';
  if (OPENAI_TYPES.has(chatType)) return 'openai';

  const page = context.page || '';
  if (page.startsWith('/dashboard') || page.startsWith('/admin') || page.includes('/performance')) {
    return 'openai';
  }
  if (page.includes('/upload')) return 'gemini';
  return 'gemini';
}

function fallbackReply(message, context = {}) {
  const msg = (message || '').toLowerCase();
  if (/upload|banner|caption|title|slogan|hashtag/.test(msg)) {
    return 'Use the AI helpers on the Upload page to generate titles, slogans, and descriptions with Gemini.';
  }
  if (/dashboard|analytics|performance|views|stats/.test(msg)) {
    return 'Open your Dashboard or campaign Performance page to view live analytics and management tools.';
  }
  if (context.page?.includes('upload')) {
    return 'Fill in campaign details, upload your banner, and use AI helpers for presentation copy.';
  }
  return OFFLINE_REPLY;
}

function buildContextBits(context) {
  const bits = [];
  if (context.page) bits.push(`Page: ${context.page}`);
  if (context.category) bits.push(`Category: ${context.category}`);
  if (context.platform) bits.push(`Platform: ${context.platform}`);
  if (context.type) bits.push(`Content type: ${context.type}`);
  return bits.join('\n');
}

async function callGemini(message, context, type) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const contextBits = buildContextBits(context);
  const prompt = `${GEMINI_SYSTEM}\n${contextBits}\nTask: ${type || 'presentation'}\n\nUser: ${message}\n\nAssistant:`;

  const models = [
    process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-flash-lite-latest',
  ];

  for (const model of [...new Set(models)]) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 512, temperature: 0.75 },
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) continue;
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text) return { reply: text, mode: 'gemini', providers: ['gemini'] };
    } catch {
      /* try next model */
    }
  }
  return null;
}

async function callOpenAI(message, context, type) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const contextBits = buildContextBits(context);
  const messages = [
    { role: 'system', content: `${OPENAI_SYSTEM}\n${contextBits}\nTask: ${type || 'dashboard'}` },
  ];

  if (Array.isArray(context.history)) {
    context.history.slice(-4).forEach((turn) => {
      if (turn.role && turn.content) messages.push({ role: turn.role, content: turn.content });
    });
  }

  messages.push({ role: 'user', content: message });

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages,
        max_tokens: 500,
        temperature: 0.6,
      }),
    });
    const data = await res.json();
    if (!res.ok) return null;
    const text = data.choices?.[0]?.message?.content?.trim();
    if (text) return { reply: text, mode: 'openai', providers: ['openai'] };
  } catch {
    return null;
  }
  return null;
}

async function proxyToAiService(message, context, type) {
  const base = process.env.AI_SERVICE_URL;
  if (!base) return null;

  const res = await fetch(`${base.replace(/\/$/, '')}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context: context || {}, type: type || 'assistant' }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const reply = data.reply || data.data?.reply;
  if (!reply) return null;
  return { reply, mode: data.mode || 'proxy', providers: data.providers || [] };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { message, context, type } = req.body || {};
    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const ctx = context || {};
    const chatType = type || 'assistant';
    const provider = resolveProvider(chatType, ctx);

    const fromService = await proxyToAiService(message, ctx, chatType);
    if (fromService) {
      return res.status(200).json({ success: true, data: fromService });
    }

    let result = null;
    if (provider === 'openai') {
      result = await callOpenAI(message, ctx, chatType);
      if (!result) result = await callGemini(message, ctx, chatType);
    } else {
      result = await callGemini(message, ctx, chatType);
      if (!result) result = await callOpenAI(message, ctx, chatType);
    }

    if (result) {
      return res.status(200).json({ success: true, data: result });
    }

    const reply = fallbackReply(message, ctx);
    return res.status(200).json({
      success: true,
      data: { reply, mode: 'fallback', providers: [], fallback: true },
    });
  } catch (err) {
    console.error('ask-ai error:', err.message);
    return res.status(200).json({
      success: true,
      data: {
        reply: fallbackReply(req.body?.message, req.body?.context),
        mode: 'error',
        fallback: true,
        providers: [],
      },
    });
  }
}
