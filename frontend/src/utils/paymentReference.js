const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomSegment(length = 6) {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return out;
}

/**
 * Generate unique payment reference: CH-7HDA92
 */
export async function generatePaymentReference() {
  return `CH-${randomSegment(6)}`;
}
