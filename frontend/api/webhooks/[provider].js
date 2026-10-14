/**
 * Payment webhooks — the source of truth even if the customer closes the tab.
 *   POST /api/webhooks/paystack     (x-paystack-signature: HMAC-SHA512 of raw body)
 *   POST /api/webhooks/flutterwave  (verif-hash: secret hash set in the dashboard)
 *
 * Every successful charge is re-verified with the provider's API before fulfilment.
 */
import { loadRuntimeConfig } from '../_lib/runtimeConfig.js';
import {
  readRawBody,
  requireAdminSdk,
  verifyWithProvider,
  fulfillPayment,
  fulfillPaystackRenewal,
  linkPaystackSubscription,
  markPaystackSubscriptionStopped,
  isValidPaystackSignature,
  isValidFlutterwaveHash,
} from '../_lib/billing.js';

function getProvider(req) {
  if (req.query?.provider) return String(req.query.provider);
  const path = (req.url || '').split('?')[0];
  return path.split('/').filter(Boolean).pop();
}

async function handlePaystack(admin, event) {
  const data = event.data || {};
  switch (event.event) {
    case 'charge.success': {
      const payment = await verifyWithProvider({ provider: 'paystack', reference: data.reference });
      // Provider API unreachable → 500 so Paystack retries instead of the payment being lost.
      if (payment.status === 'unknown') throw new Error('Paystack verify unavailable');
      if (!payment.paid) return { handled: false, reason: 'not_paid' };
      const known = await admin.db.collection('billing_transactions').doc(payment.reference).get();
      if (known.exists && known.data().campaignId) return fulfillPayment(admin, payment);
      return fulfillPaystackRenewal(admin, payment);
    }
    case 'subscription.create':
      return linkPaystackSubscription(admin, data);
    case 'subscription.disable':
    case 'subscription.not_renew':
      return markPaystackSubscriptionStopped(admin, data);
    default:
      return { handled: false, reason: 'ignored_event' };
  }
}

async function handleFlutterwave(admin, event) {
  const data = event.data || {};
  const type = event.event || event['event.type'] || event.type;
  if (type && !String(type).startsWith('charge.')) return { handled: false, reason: 'ignored_event' };
  if (!data.id && !data.tx_ref) return { handled: false, reason: 'no_reference' };
  const payment = await verifyWithProvider({
    provider: 'flutterwave',
    reference: data.tx_ref,
    transactionId: data.id ? String(data.id) : '',
  });
  if (payment.status === 'unknown') throw new Error('Flutterwave verify unavailable');
  if (!payment.paid) return { handled: false, reason: 'not_paid' };
  return fulfillPayment(admin, payment);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false });

  const provider = getProvider(req);
  const raw = await readRawBody(req);
  await loadRuntimeConfig();

  let event;
  try {
    event = raw ? JSON.parse(raw) : req.body;
  } catch {
    return res.status(400).json({ success: false, message: 'Invalid JSON' });
  }

  if (provider === 'paystack') {
    const signature = req.headers['x-paystack-signature'];
    if (!isValidPaystackSignature(raw, signature)) {
      return res.status(401).json({ success: false, message: 'Bad signature' });
    }
  } else if (provider === 'flutterwave') {
    const hash = req.headers['verif-hash'] || req.headers['flutterwave-signature'];
    if (!isValidFlutterwaveHash(hash)) {
      return res.status(401).json({ success: false, message: 'Bad signature' });
    }
  } else {
    return res.status(404).json({ success: false });
  }

  try {
    const admin = await requireAdminSdk();
    const result = provider === 'paystack'
      ? await handlePaystack(admin, event)
      : await handleFlutterwave(admin, event);
    return res.status(200).json({ success: true, result: { ok: !!result?.ok, reason: result?.reason || null } });
  } catch (err) {
    console.error(`[webhook:${provider}]`, err);
    // 500 lets the provider retry later.
    return res.status(500).json({ success: false });
  }
}
