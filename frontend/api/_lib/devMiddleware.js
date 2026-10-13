/**
 * Vite dev-server middleware: runs the same serverless handlers as Vercel,
 * so `npm run dev` supports OTP sign-in, billing, webhooks and AI locally.
 */
import otpSendHandler from '../auth/otp-send.js';
import otpVerifyHandler from '../auth/otp-verify.js';
import billingHandler from '../billing/[action].js';
import webhookHandler from '../webhooks/[provider].js';
import aiStudioHandler from '../ai-studio.js';
import askAiHandler from '../ask-ai.js';
import recommendationsHandler from '../recommendations.js';

function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function createExpressLikeRes(nodeRes) {
  const res = {
    setHeader(name, value) {
      nodeRes.setHeader(name, value);
      return res;
    },
    status(code) {
      nodeRes.statusCode = code;
      return res;
    },
    json(body) {
      if (!nodeRes.headersSent) nodeRes.setHeader('Content-Type', 'application/json');
      nodeRes.end(JSON.stringify(body));
      return res;
    },
    end(data) {
      nodeRes.end(data);
      return res;
    },
  };
  return res;
}

function resolveRoute(path) {
  if (path === '/api/auth/otp-send') return { handler: otpSendHandler, query: {} };
  if (path === '/api/auth/otp-verify') return { handler: otpVerifyHandler, query: {} };
  if (path === '/api/ai-studio') return { handler: aiStudioHandler, query: {} };
  if (path === '/api/ask-ai') return { handler: askAiHandler, query: {} };
  if (path === '/api/recommendations') return { handler: recommendationsHandler, query: {} };
  let m = path.match(/^\/api\/billing\/([\w-]+)$/);
  if (m) return { handler: billingHandler, query: { action: m[1] } };
  m = path.match(/^\/api\/webhooks\/([\w-]+)$/);
  if (m) return { handler: webhookHandler, query: { provider: m[1] } };
  return null;
}

export function createDevApiMiddleware() {
  return async (req, res, next) => {
    const [path, search = ''] = (req.url || '').split('?');
    const route = resolveRoute(path);
    if (!route) return next();

    try {
      const raw = req.method === 'POST' ? await readRaw(req) : '';
      let body = {};
      if (raw) {
        try {
          body = JSON.parse(raw);
        } catch {
          body = {};
        }
      }
      const query = { ...Object.fromEntries(new URLSearchParams(search)), ...route.query };
      await route.handler(
        { method: req.method, headers: req.headers, url: req.url, query, body, rawBody: raw },
        createExpressLikeRes(res),
      );
    } catch (err) {
      console.error('[dev api]', err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, message: err.message || 'API error' }));
      }
    }
  };
}

/** @deprecated kept for older imports */
export const createOtpDevMiddleware = createDevApiMiddleware;
