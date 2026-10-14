/**
 * /api/billing/:action
 *   GET  /api/billing/config          → which payment providers are live
 *   POST /api/billing/checkout        → start a Paystack / Flutterwave checkout (auth)
 *   POST /api/billing/verify          → confirm a payment after redirect and activate it
 *   POST /api/billing/cancel-renewal  → stop card auto-renew (auth, owner)
 *
 * One serverless function for all billing actions keeps the Vercel function count low.
 */
import { loadRuntimeConfig } from '../_lib/runtimeConfig.js';
import { autoSetupState } from '../_lib/autoSetup.js';
import { getFirebaseAdmin } from '../_lib/otpHelpers.js';
import {
  HttpError,
  applyCors,
  sendJson,
  getAppOrigin,
  requireAdminSdk,
  requireUser,
  loadOwnedCampaign,
  createCheckout,
  verifyWithProvider,
  fulfillPayment,
  markCheckoutNotPaid,
  cancelAutoRenew,
  publicBillingConfig,
} from '../_lib/billing.js';

function getAction(req) {
  if (req.query?.action) return String(req.query.action);
  const path = (req.url || '').split('?')[0];
  return path.split('/').filter(Boolean).pop();
}

function getBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

const FRIENDLY_FAILURES = {
  amount_mismatch: 'The amount paid does not match the plan price. Contact support with your reference.',
  currency_mismatch: 'Payments must be made in Ghana cedis (GHS).',
  campaign_missing: 'Payment received, but the campaign page was not found. Contact support with your reference.',
  unknown_reference: 'We could not match this payment to a checkout. Contact support with your reference.',
  provider_mismatch: 'This reference belongs to a different payment provider.',
};

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const action = getAction(req);

  try {
    await loadRuntimeConfig();
    if (action === 'config') {
      res.setHeader('Cache-Control', 'no-store');
      // health: yes/no flags only (never key values) so setup problems are visible at a glance
      const health = {
        firebaseAdmin: !!(await getFirebaseAdmin().catch(() => null)),
        ...autoSetupState(),
        ai: !!(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY),
      };
      return sendJson(res, 200, { success: true, data: { ...publicBillingConfig(), health } });
    }

    if (req.method !== 'POST') {
      throw new HttpError(405, 'Method not allowed');
    }

    const body = getBody(req);
    const admin = await requireAdminSdk();

    if (action === 'checkout') {
      const user = await requireUser(req, admin);
      const campaign = await loadOwnedCampaign(admin, body.campaignId, user);
      const checkout = await createCheckout({
        admin,
        user,
        campaign,
        input: {
          provider: body.provider,
          product: body.product,
          cycle: body.cycle,
          variantId: body.variantId,
          autoRenew: !!body.autoRenew,
        },
        origin: getAppOrigin(req),
      });
      return sendJson(res, 200, { success: true, data: checkout });
    }

    if (action === 'verify') {
      const provider = body.provider === 'flutterwave' ? 'flutterwave' : 'paystack';
      const reference = String(body.reference || body.tx_ref || '').trim();
      const transactionId = body.transactionId ? String(body.transactionId) : '';
      if (!reference && !transactionId) throw new HttpError(400, 'Missing payment reference.');

      const payment = await verifyWithProvider({ provider, reference, transactionId });
      if (!payment.paid) {
        if (reference && payment.status !== 'unknown' && payment.status !== 'mismatch') {
          await markCheckoutNotPaid(admin, { provider, reference, status: payment.status }).catch(() => {});
        }
        return sendJson(res, 200, {
          success: true,
          data: { paid: false, status: payment.status, message: payment.message || 'Payment not completed yet.' },
        });
      }

      const result = await fulfillPayment(admin, payment);
      if (!result.ok) {
        return sendJson(res, 200, {
          success: false,
          data: { paid: true, fulfilled: false, reason: result.reason },
          message: FRIENDLY_FAILURES[result.reason] || 'Payment received but could not be applied. Contact support.',
        });
      }
      const tx = result.tx || {};
      return sendJson(res, 200, {
        success: true,
        data: {
          paid: true,
          fulfilled: true,
          already: !!result.already,
          reference: payment.reference,
          product: tx.product,
          cycle: tx.cycle,
          itemName: tx.itemName,
          amount: tx.amount,
          campaignId: tx.campaignId,
          campaignSlug: tx.campaignSlug,
          campaignTitle: tx.campaignTitle,
        },
      });
    }

    if (action === 'cancel-renewal') {
      const user = await requireUser(req, admin);
      const campaign = await loadOwnedCampaign(admin, body.campaignId, user);
      await cancelAutoRenew(admin, campaign);
      return sendJson(res, 200, { success: true, data: { autoRenew: false } });
    }

    throw new HttpError(404, 'Unknown billing action');
  } catch (err) {
    const known = err instanceof HttpError;
    const status = known ? err.status : 500;
    if (status >= 500) console.error('[billing]', action, err);
    return sendJson(res, status, {
      success: false,
      // Internal errors stay in the server log; customers get a safe message.
      message: known ? err.message : 'Something went wrong on our side. Please try again in a minute.',
      code: known ? err.code : 'SERVER_ERROR',
    });
  }
}
