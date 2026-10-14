import api from './api';

let configCache = null;
let clockOffsetMs = 0;

/** Current time according to the server (phones with a wrong clock would otherwise fail trial checks). */
export function serverNow() {
  return Date.now() + clockOffsetMs;
}

/** Which payment providers are switched on (from the server's env vars). */
export async function getBillingConfig({ fresh = false } = {}) {
  if (configCache && !fresh) return configCache;
  try {
    const sentAt = Date.now();
    const res = await api.get('/billing/config');
    const receivedAt = Date.now();
    configCache = res.data?.data || null;
    if (configCache?.serverTime && receivedAt - sentAt < 15000) {
      clockOffsetMs = Number(configCache.serverTime) - Math.round((sentAt + receivedAt) / 2);
    }
  } catch {
    configCache = null;
  }
  // Never pretend a provider is on when we could not ask the server — the checkout would only fail later.
  return configCache || {
    currency: 'GHS',
    providers: { paystack: false, flutterwave: false },
    autoRenew: { monthly: false, yearly: false },
    unavailable: true,
  };
}

/**
 * Start a hosted checkout and redirect the browser to Paystack / Flutterwave.
 * @param {{ campaignId:string, product:'pro'|'spotlight', cycle?:'monthly'|'yearly', variantId?:string, provider:'paystack'|'flutterwave', autoRenew?:boolean }} input
 */
export async function startCheckout(input) {
  const res = await api.post('/billing/checkout', input);
  const data = res.data?.data;
  if (!data?.url) throw new Error(res.data?.message || 'Could not start checkout');
  try {
    sessionStorage.setItem('ch-last-checkout', JSON.stringify({ ...input, reference: data.reference, at: Date.now() }));
  } catch {
    /* ignore */
  }
  window.location.assign(data.url);
  return data;
}

/** Confirm a payment after the provider redirects back. Safe to call repeatedly. */
export async function verifyPayment({ provider, reference, transactionId }) {
  const res = await api.post('/billing/verify', { provider, reference, transactionId });
  return { ok: res.data?.success !== false, message: res.data?.message, ...(res.data?.data || {}) };
}

export async function cancelAutoRenew(campaignId) {
  const res = await api.post('/billing/cancel-renewal', { campaignId });
  return res.data?.data;
}
