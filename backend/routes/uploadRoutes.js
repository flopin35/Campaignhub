import { Router } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const router = Router();

const AI_SERVICE_URL = process.env.AI_SERVICE_URL;
const isProduction = process.env.NODE_ENV === 'production';

const OFFLINE_REPLY =
  "I'm temporarily offline. Visit Upload to create a campaign, or browse /campaigns. " +
  'Pay via MoMo 0509002402, upload proof, and admin activates your campaign with a share link & QR code.';

function aiUnavailableResponse(res, mode = 'offline') {
  if (isProduction) {
    return res.status(503).json({
      success: false,
      message: 'AI service is temporarily unavailable',
    });
  }

  return res.json({
    success: true,
    data: { reply: OFFLINE_REPLY, mode, fallback: true, providers: [] },
  });
}

/**
 * Proxy AI requests to the Python FastAPI microservice.
 */
router.post('/ask-ai', async (req, res) => {
  try {
    const { message, context, type } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    if (!AI_SERVICE_URL) {
      return aiUnavailableResponse(res, 'unconfigured');
    }

    const response = await axios.post(
      `${AI_SERVICE_URL}/api/ai/chat`,
      { message, context: context || {}, type: type || 'assistant' },
      { timeout: 45000 }
    );

    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error('AI proxy error:', error.message);

    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return aiUnavailableResponse(res, 'offline');
    }

    if (error.response?.data?.reply) {
      return res.json({ success: true, data: error.response.data });
    }

    if (isProduction) {
      return res.status(503).json({
        success: false,
        message: 'AI service error',
      });
    }

    return aiUnavailableResponse(res, 'error');
  }
});

router.post('/recommendations', async (req, res) => {
  try {
    const { campaigns, preferences } = req.body;

    if (!AI_SERVICE_URL) {
      if (isProduction) {
        return res.status(503).json({ success: false, message: 'AI service is not configured' });
      }
      return res.json({ success: true, data: { recommendations: [], fallback: true } });
    }

    const response = await axios.post(`${AI_SERVICE_URL}/api/ai/recommendations`, {
      campaigns: campaigns || [],
      preferences: preferences || {},
    });

    res.json({ success: true, data: response.data });
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      if (isProduction) {
        return res.status(503).json({ success: false, message: 'AI service is temporarily unavailable' });
      }
      return res.json({ success: true, data: { recommendations: [], fallback: true } });
    }
    res.status(500).json({ success: false, message: 'AI service error' });
  }
});

export default router;
