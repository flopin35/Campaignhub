/** Dashboard recommendations — OpenAI when available */

async function callOpenAIRecommendations(campaigns, preferences = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !campaigns.length) return null;

  const limit = preferences.limit || 5;
  const sorted = [...campaigns]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, limit);

  const campaignData = sorted
    .map((c, i) => `${i + 1}. ${c.title} — ${(c.description || '').slice(0, 100)}`)
    .join('\n');

  const interest = preferences.category || 'campaigns you might like';

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a dashboard recommendation engine. Write one short sentence per campaign explaining why it fits the user. Numbered list only.',
          },
          { role: 'user', content: `User interest: ${interest}\n\nCampaigns:\n${campaignData}` },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    if (!res.ok) return null;

    const blurbs = (data.choices?.[0]?.message?.content || '').trim().split('\n');
    const recommendations = sorted.map((c, i) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      reason: blurbs[i]?.replace(/^\d+[.)]\s*/, '') || 'Recommended for you',
      aiBlurb: blurbs[i]?.replace(/^\d+[.)]\s*/, '') || '',
    }));

    return { recommendations, mode: 'openai' };
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const base = process.env.AI_SERVICE_URL;
    if (base) {
      const proxy = await fetch(`${base.replace(/\/$/, '')}/api/ai/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body || {}),
        signal: AbortSignal.timeout(30000),
      });
      if (proxy.ok) {
        const data = await proxy.json();
        return res.status(200).json({ success: true, data });
      }
    }

    const { campaigns = [], preferences = {} } = req.body || {};

    const fromOpenAI = await callOpenAIRecommendations(campaigns, preferences);
    if (fromOpenAI) {
      return res.status(200).json({ success: true, data: fromOpenAI });
    }

    const sorted = [...campaigns]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, preferences.limit || 5)
      .map((c) => ({ id: c.id, title: c.title, slug: c.slug, reason: 'Popular on CampaignHub' }));

    return res.status(200).json({
      success: true,
      data: { recommendations: sorted, fallback: true, mode: 'fallback' },
    });
  } catch {
    return res.status(200).json({
      success: true,
      data: { recommendations: [], fallback: true, mode: 'error' },
    });
  }
}
