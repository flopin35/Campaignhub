import otpSendHandler from '../auth/otp-send.js';
import otpVerifyHandler from '../auth/otp-verify.js';

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
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
      if (!nodeRes.headersSent) {
        nodeRes.setHeader('Content-Type', 'application/json');
      }
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

const ROUTES = {
  '/api/auth/otp-send': otpSendHandler,
  '/api/auth/otp-verify': otpVerifyHandler,
};

/**
 * Vite dev server middleware — runs the same handlers as Vercel /api/auth/otp-*.
 */
export function createOtpDevMiddleware() {
  return async (req, res, next) => {
    const path = req.url?.split('?')[0];
    const handler = ROUTES[path];
    if (!handler) return next();

    try {
      const body = req.method === 'POST' ? await readJsonBody(req) : {};
      await handler({ method: req.method, body }, createExpressLikeRes(res));
    } catch (err) {
      console.error('[OTP dev]', err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, message: err.message || 'OTP handler error' }));
      }
    }
  };
}
