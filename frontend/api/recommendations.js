/**
 * Retired in the CampaignHub Pro upgrade.
 * The old endpoint had no sign-in, no rate limit and no size limit, so anyone could spend the
 * project's OpenAI/Gemini credit. AI writing now lives in /api/ai-studio (signed-in Pro owners,
 * daily cap). Nothing in the app calls this route any more.
 */
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(410).json({
    success: false,
    message: 'This endpoint has been retired. Use AI Studio inside your campaign workspace.',
  });
}
