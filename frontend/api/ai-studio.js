/**
 * POST /api/ai-studio — CampaignHub Pro AI writer (speeches, ads, posts, statements…)
 * Requires a signed-in owner of a campaign page that is on Pro or in trial.
 * Daily cap per campaign keeps provider costs predictable.
 */
import { loadRuntimeConfig } from './_lib/runtimeConfig.js';
import {
  HttpError,
  applyCors,
  sendJson,
  requireAdminSdk,
  requireUser,
  loadOwnedCampaign,
  campaignHasPro,
  campaignIsTrialOnly,
} from './_lib/billing.js';

const DAILY_LIMIT = Number(process.env.AI_STUDIO_DAILY_LIMIT || 80);
/** Free-trial pages get a smaller daily allowance so throwaway accounts cannot run up AI bills. */
const TRIAL_DAILY_LIMIT = Number(process.env.AI_STUDIO_TRIAL_DAILY_LIMIT || 20);

const TASKS = {
  speech: { label: 'Rally speech', maxTokens: 1400, guide: 'Write a stirring campaign speech to be delivered at a rally or town hall. Open strong, tell one short local story, list 3 concrete commitments, end with a call to vote. Use short spoken sentences and natural pauses (…).' },
  social: { label: 'Social media posts', maxTokens: 900, guide: 'Write 3 distinct social media posts (Facebook, X/Twitter, Instagram/TikTok caption). Each with a hook, a clear message and a call to action. Add 3–5 relevant hashtags each. Label each post.' },
  ad: { label: 'Ad copy', maxTokens: 900, guide: 'Write ad copy for a paid campaign: 3 headline options (max 40 characters), 2 primary text options (max 125 words), 1 radio script of 30 seconds with [SFX] cues, and 1 billboard line (max 7 words). Label each section.' },
  sms: { label: 'SMS / WhatsApp message', maxTokens: 400, guide: 'Write 3 SMS/WhatsApp broadcast variants. Each MUST be under 160 characters, friendly, specific, with a clear action. Use {name} as a placeholder for the recipient\'s first name where natural.' },
  statement: { label: 'Press statement / rebuttal', maxTokens: 1100, guide: 'Write a calm, factual press statement or rebuttal. Structure: headline, dateline, 3–4 short paragraphs, a quote from the candidate, and contact line. Never insult opponents; correct the record with facts the user provides.' },
  manifesto: { label: 'Manifesto summary', maxTokens: 1000, guide: 'Turn the user\'s policy notes into a clear manifesto summary: a one-line vision, 5 priority pillars each with 2 concrete, measurable commitments, and a closing promise. Plain language a market woman or farmer would understand.' },
  slogan: { label: 'Slogans', maxTokens: 400, guide: 'Generate 10 memorable campaign slogans (max 6 words each), mixing English and the chosen local language where natural. Then pick the best 2 and explain why in one line each.' },
  doorstep: { label: 'Canvassing script', maxTokens: 800, guide: 'Write a door-to-door canvassing script for volunteers: greeting, 20-second pitch, 3 likely voter questions with short answers, how to ask for support, and how to record the voter\'s support level (strong / leaning / undecided / opposed).' },
  strategy: { label: 'Strategy advice', maxTokens: 1200, guide: 'Act as a senior campaign strategist. Give a prioritized, practical action plan for the next 14 days based on the user\'s situation and data. Use numbered steps with owners and measurable targets.' },
};

const LANGUAGES = ['English', 'Twi', 'Fante', 'Ga', 'Ewe', 'Hausa', 'Dagbani', 'Pidgin'];

const clip = (v, n = 160) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, n);

function systemPrompt(campaign, language, tone) {
  const facts = [
    campaign.candidateName || campaign.ownerName ? `Candidate: ${clip(campaign.candidateName || campaign.ownerName, 80)}` : '',
    campaign.campaignType ? `Office: ${clip(campaign.campaignType, 60)}` : '',
    campaign.party ? `Party: ${clip(campaign.party, 80)}` : '',
    campaign.constituency ? `Constituency: ${clip(campaign.constituency, 80)}` : '',
    campaign.region ? `Region: ${clip(campaign.region, 60)}` : '',
    campaign.slogan ? `Slogan: ${clip(campaign.slogan, 120)}` : '',
    campaign.title ? `Campaign: ${clip(campaign.title, 120)}` : '',
    Array.isArray(campaign.priorities) && campaign.priorities.length
      ? `Priorities: ${campaign.priorities.slice(0, 6).map((p) => clip(p?.title, 80)).filter(Boolean).join('; ')}`
      : '',
  ].filter(Boolean).join('\n').slice(0, 1500);

  return [
    'You are CampaignHub Studio, an expert political communications writer for campaigns in Ghana.',
    'You write truthful, persuasive, respectful content. Never invent statistics, endorsements or quotes from real people; use [placeholders] where facts are missing.',
    'Never write content that attacks ethnic or religious groups, incites violence, or spreads misinformation about voting procedures.',
    `Write in ${language}${language !== 'English' ? ' (if a phrase is hard to translate, keep it in English)' : ''}. Tone: ${tone}.`,
    'Use Ghanaian context naturally (cedis, constituencies, polling stations, local markets, trotro, etc.) without stereotypes.',
    facts ? `Campaign facts:\n${facts}` : '',
  ].filter(Boolean).join('\n');
}

const uniq = (list) => [...new Set(list.filter(Boolean))];
const short = (v) => String(v || '').replace(/\s+/g, ' ').slice(0, 140);

/** OpenAI: tries the configured model, then safe fallbacks. Works with gpt-4o / 4.1 / 5 / o-series. */
async function callOpenAI(system, user, maxTokens, errors) {
  const key = (process.env.OPENAI_API_KEY || '').trim();
  if (!key) return null;
  for (const model of uniq([process.env.OPENAI_MODEL, 'gpt-4o-mini', 'gpt-4.1-mini'])) {
    const reasoning = /^(o\d|gpt-5)/.test(model);
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          // max_completion_tokens works on every current model; max_tokens is rejected by newer ones
          max_completion_tokens: reasoning ? maxTokens + 4000 : maxTokens,
          ...(reasoning ? {} : { temperature: 0.75 }),
        }),
        signal: AbortSignal.timeout(40000),
      });
      const data = await res.json().catch(() => ({}));
      const text = data.choices?.[0]?.message?.content?.trim();
      if (res.ok && text) return text;
      errors.push(`OpenAI ${model}: ${res.status} ${short(data.error?.message || 'empty reply')}`);
      if (res.status === 401 || res.status === 429) break; // bad key / no credit: other models won't help
    } catch (err) {
      errors.push(`OpenAI ${model}: ${short(err.name === 'TimeoutError' ? 'timed out' : err.message)}`);
    }
  }
  return null;
}

/** Gemini: current models first (older 1.5 / 2.0 models are being retired by Google). */
async function callGemini(system, user, maxTokens, errors) {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  if (!key) return null;
  const models = uniq([process.env.GEMINI_MODEL, 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite', 'gemini-2.0-flash']);
  for (const model of models) {
    const isFlash25 = /^gemini-2\.5-flash/.test(model);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: {
            temperature: 0.8,
            // "thinking" models spend output tokens on reasoning; keep room so the draft is never empty
            maxOutputTokens: isFlash25 ? maxTokens : maxTokens + 4096,
            ...(isFlash25 ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
          },
        }),
        signal: AbortSignal.timeout(40000),
      });
      const data = await res.json().catch(() => ({}));
      const text = data.candidates?.[0]?.content?.parts?.filter((p) => !p.thought).map((p) => p.text || '').join('').trim();
      if (res.ok && text) return text;
      errors.push(`Gemini ${model}: ${res.status} ${short(data.error?.message || data.promptFeedback?.blockReason || data.candidates?.[0]?.finishReason || 'empty reply')}`);
      if (res.status === 400 && /API key/i.test(data.error?.message || '')) break;
      if (res.status === 403) break;
    } catch (err) {
      errors.push(`Gemini ${model}: ${short(err.name === 'TimeoutError' ? 'timed out' : err.message)}`);
    }
  }
  return null;
}

export default async function handler(req, res) {
  applyCors(req, res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return sendJson(res, 405, { success: false, message: 'Method not allowed' });

  try {
    await loadRuntimeConfig();
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const task = TASKS[body.task] ? body.task : 'social';
    const language = LANGUAGES.includes(body.language) ? body.language : 'English';
    const tone = String(body.tone || 'inspiring').slice(0, 40);
    const brief = String(body.prompt || '').trim().slice(0, 4000);
    if (brief.length < 5) throw new HttpError(400, 'Tell the AI what you need (a sentence or two is enough).');

    if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
      throw new HttpError(503, 'AI Studio is not switched on yet. The site owner needs to add an OpenAI or Gemini key in Admin → Setup.', 'AI_NOT_CONFIGURED');
    }
    const admin = await requireAdminSdk();
    const user = await requireUser(req, admin);
    const campaign = await loadOwnedCampaign(admin, body.campaignId, user);
    if (!campaignHasPro(campaign) && !user.isAdmin) {
      throw new HttpError(402, 'AI Studio is part of CampaignHub Pro. Renew your plan to keep writing.', 'PRO_REQUIRED');
    }

    const limit = campaignIsTrialOnly(campaign) && !user.isAdmin ? TRIAL_DAILY_LIMIT : DAILY_LIMIT;
    const day = new Date().toISOString().slice(0, 10);
    const usageRef = admin.db.collection('ai_usage').doc(`${campaign.id}_${day}`);
    const used = await admin.db.runTransaction(async (t) => {
      const snap = await t.get(usageRef);
      const count = snap.exists ? snap.data().count || 0 : 0;
      if (count >= limit) return -1;
      t.set(usageRef, { campaignId: campaign.id, day, count: count + 1, updatedAt: new Date() }, { merge: true });
      return count + 1;
    });
    if (used < 0) {
      throw new HttpError(429, `Daily AI limit reached (${limit} drafts${limit === TRIAL_DAILY_LIMIT && limit !== DAILY_LIMIT ? ' on the free trial' : ''}). It resets at midnight.`);
    }

    const spec = TASKS[task];
    const system = systemPrompt(campaign, language, tone);
    const userMsg = `Task: ${spec.label}\nInstructions: ${spec.guide}\n\nWhat the campaign needs:\n${brief}`;

    const errors = [];
    const text = (await callOpenAI(system, userMsg, spec.maxTokens, errors))
      || (await callGemini(system, userMsg, spec.maxTokens, errors));

    if (!text) {
      console.error('[ai-studio] all AI providers failed:', errors.join(' | '));
      // Don't charge a failed attempt against the daily allowance.
      const { FieldValue } = await import('firebase-admin/firestore');
      await usageRef.set({ count: FieldValue.increment(-1) }, { merge: true }).catch(() => {});
      const detail = user.isAdmin && errors.length ? ` Details for admin: ${errors.join(' | ').slice(0, 400)}` : '';
      throw new HttpError(503, `The AI writer could not answer right now. Please try again in a minute.${detail}`);
    }

    return sendJson(res, 200, {
      success: true,
      data: { text, task, language, remainingToday: Math.max(0, limit - used) },
    });
  } catch (err) {
    const known = err instanceof HttpError;
    const status = known ? err.status : 500;
    if (status >= 500) console.error('[ai-studio]', err);
    return sendJson(res, status, {
      success: false,
      message: known ? err.message : 'The AI writer hit a problem. Please try again in a minute.',
      code: known ? err.code : 'SERVER_ERROR',
    });
  }
}
