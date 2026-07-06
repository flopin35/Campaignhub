/**
 * Local OTP round-trip: send → verify with dev-logged code (captures console).
 * Requires backend/.env Firebase Admin credentials.
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sendHandler from '../api/auth/otp-send.js';
import verifyHandler from '../api/auth/otp-verify.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(root, '..');

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    val = val.replace(/\\n/g, '\n');
    if (process.env[key] == null || process.env[key] === '') process.env[key] = val;
  }
}

loadEnvFile(join(root, '.env'));
loadEnvFile(join(repoRoot, 'backend', '.env'));
process.env.OTP_DEV_LOG = 'true';

const email = `otp-roundtrip-${Date.now()}@example.com`;
let capturedCode = null;
const originalLog = console.info;
console.info = (...args) => {
  const text = args.join(' ');
  const m = text.match(/Dev code for .+ : (\d{6})/);
  if (m) capturedCode = m[1];
  originalLog(...args);
};

function callHandler(handler, body) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      setHeader() {},
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        resolve({ status: this.statusCode, data });
      },
      end() {
        resolve({ status: this.statusCode, data: null });
      },
    };
    handler({ method: 'POST', body }, res).catch(reject);
  });
}

const send = await callHandler(sendHandler, { email });
console.info = originalLog;

if (send.status !== 200 || !capturedCode) {
  console.error('FAIL send', send, 'code', capturedCode);
  process.exit(1);
}
console.log('PASS send, code captured');

const verify = await callHandler(verifyHandler, { email, code: capturedCode });
if (verify.status !== 200 || !verify.data?.customToken) {
  console.error('FAIL verify', verify);
  process.exit(1);
}

console.log('PASS verify — customToken issued, isNewUser:', verify.data.isNewUser);
process.exit(0);
