import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/auth';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_ATTEMPTS = 12;

function randomSegment(length = 6) {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return out;
}

async function referenceExists(ref) {
  const q = query(collection(db, 'payments'), where('paymentReference', '==', ref));
  const snap = await getDocs(q);
  return !snap.empty;
}

/**
 * Generate unique payment reference: CH-A82KD1
 * Checks Firestore to prevent duplicates.
 */
export async function generatePaymentReference() {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const ref = `CH-${randomSegment(6)}`;
    const exists = await referenceExists(ref);
    if (!exists) return ref;
  }
  return `CH-${randomSegment(6)}${Date.now().toString(36).slice(-2).toUpperCase()}`;
}
