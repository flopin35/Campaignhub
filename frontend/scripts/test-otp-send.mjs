/**
 * Test OTP send handler locally (uses frontend/.env server vars).
 * Usage: node scripts/test-otp-send.mjs you@example.com
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import handler from '../api/auth/otp-send.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(name) {
  const path = join(root, name);
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
    if (process.env[key] == null || process.env[key] === '') process.env[key] = val;
  }
}

loadEnvFile('.env');
loadEnvFile('.env.local');

const email = process.argv[2] || 'test@example.com';

const result = await new Promise((resolve, reject) => {
  const res = {
    statusCode: 200,
    headers: {},
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      resolve({ status: this.statusCode, body });
    },
    end() {
      resolve({ status: this.statusCode, body: null });
    },
  };

  handler({ method: 'POST', body: { email } }, res).catch(reject);
});

console.log('Status:', result.status);
console.log(JSON.stringify(result.body, null, 2));
process.exit(result.status === 200 ? 0 : 1);
