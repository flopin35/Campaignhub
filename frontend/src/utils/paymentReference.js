const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomSegment(length = 6) {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return out;
}

/**
 * Generate unique payment reference: CH-A82KD1
 * Client-side only — avoids Firestore list queries blocked by security rules.
 */
export async function generatePaymentReference() {
  const suffix = Date.now().toString(36).slice(-2).toUpperCase();
  return `CH-${randomSegment(6)}${suffix}`;
}
