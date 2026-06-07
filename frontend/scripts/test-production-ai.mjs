/**
 * Production-mode smoke tests for split AI routing.
 * Loads keys from ai-service/.env when present.
 */
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dir, '../../ai-service/.env');

if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach((line) => {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    });
}

const handler = (await import('../api/ask-ai.js')).default;

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    end() {
      return this;
    },
  };
  return res;
}

async function callAskAi(payload) {
  const req = { method: 'POST', body: payload };
  const res = mockRes();
  await handler(req, res);
  return { status: res.statusCode, data: res.body };
}

const tests = [
  {
    name: 'presentation → gemini',
    payload: {
      message: 'Suggest one short campaign slogan for a church event',
      context: { page: '/upload', category: 'Religious' },
      type: 'presentation',
    },
    expectMode: 'gemini',
  },
  {
    name: 'dashboard → openai',
    payload: {
      message: 'What should I check on my dashboard to improve campaign performance?',
      context: { page: '/dashboard' },
      type: 'dashboard',
    },
    expectMode: 'openai',
  },
  {
    name: 'distribution → gemini',
    payload: {
      message: 'Write a WhatsApp post for a health fair campaign',
      context: { page: '/dashboard', platform: 'whatsapp' },
      type: 'distribution',
    },
    expectMode: 'gemini',
  },
];

let passed = 0;
let failed = 0;

console.log('CampaignHub production AI smoke tests\n');

for (const t of tests) {
  try {
    const { status, data } = await callAskAi(t.payload);
    const mode = data?.data?.mode;
    const reply = data?.data?.reply || '';
    const ok = status === 200 && data?.success && reply.length > 10;
    const modeOk = !t.expectMode || mode === t.expectMode || mode === 'fallback';

    if (ok && modeOk) {
      console.log(`✓ ${t.name} — mode=${mode}, len=${reply.length}`);
      passed++;
    } else {
      console.log(`✗ ${t.name} — status=${status}, mode=${mode}, expected=${t.expectMode}`);
      failed++;
    }
  } catch (err) {
    console.log(`✗ ${t.name} — ${err.message}`);
    failed++;
  }
}

console.log(`\nResult: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
