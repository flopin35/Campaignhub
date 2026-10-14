/**
 * Server-side billing core: Paystack + Flutterwave checkout, verification and
 * idempotent fulfilment into Firestore (via Firebase Admin, which bypasses rules).
 *
 * Firestore writes:
 *   billing_transactions/{reference}  — one doc per checkout (server-only writes)
 *   campaigns/{id}.subscription        — public Pro status for that campaign page (no provider secrets)
 *   billing_accounts/{campaignId}      — private provider codes (Paystack customer / plan / subscription)
 *   campaigns/{id}.boost*              — Spotlight placement
 *   notifications/{auto}               — receipt notification for the owner
 */
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { getFirebaseAdmin } from './otpHelpers.js';
import {
  CURRENCY,
  GRACE_DAYS,
  resolveProduct,
  getProPlan,
  getSpotlightPackage,
} from './billingCatalog.js';

const DAY_MS = 86400000;
/** Card auto-renew charges land on the calendar date — keep a small buffer so tools never flicker off. */
const AUTO_RENEW_BUFFER_DAYS = 2;

export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'daakukwaku7@gmail.com').toLowerCase();

/* ------------------------------------------------------------------ */
/* HTTP helpers                                                        */
/* ------------------------------------------------------------------ */

export class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function sendJson(res, status, body) {
  res.status(status).json(body);
}

export function applyCors(req, res, methods = 'GET, POST, OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', process.env.APP_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function getAppOrigin(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  const origin = req.headers?.origin;
  if (origin && /^https?:\/\//.test(origin)) return origin.replace(/\/$/, '');
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host;
  const proto = req.headers?.['x-forwarded-proto'] || 'https';
  return host ? `${proto}://${host}` : 'https://www.campaignhubgh.com';
}

/** Read the untouched request body (needed for webhook signatures). */
export async function readRawBody(req) {
  if (typeof req.rawBody === 'string') return req.rawBody;
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody.toString('utf8');

  const fromStream = await new Promise((resolve) => {
    if (!req.on || req.readableEnded || req.complete && !req.readable) {
      resolve('');
      return;
    }
    const chunks = [];
    const timer = setTimeout(() => resolve(Buffer.concat(chunks).toString('utf8')), 3000);
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => {
      clearTimeout(timer);
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', () => {
      clearTimeout(timer);
      resolve('');
    });
  });
  if (fromStream) return fromStream;

  // Body was already parsed by the platform — re-serialize (Paystack sends compact JSON).
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);
  if (typeof req.body === 'string') return req.body;
  return '';
}

export function safeEqual(a = '', b = '') {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/* ------------------------------------------------------------------ */
/* Auth + Firestore                                                     */
/* ------------------------------------------------------------------ */

export async function requireAdminSdk() {
  const admin = await getFirebaseAdmin();
  if (!admin) {
    throw new HttpError(503, 'Billing is not configured yet (missing Firebase Admin credentials).', 'ADMIN_MISSING');
  }
  return admin;
}

export async function requireUser(req, admin) {
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new HttpError(401, 'Please sign in to continue.', 'UNAUTHENTICATED');
  try {
    const decoded = await admin.auth.verifyIdToken(token);
    const email = (decoded.email || '').toLowerCase();
    return {
      uid: decoded.uid,
      email,
      emailVerified: decoded.email_verified === true,
      name: decoded.name || '',
      isAdmin: email === ADMIN_EMAIL && decoded.email_verified === true,
    };
  } catch {
    throw new HttpError(401, 'Your session expired. Sign in again.', 'UNAUTHENTICATED');
  }
}

export async function loadOwnedCampaign(admin, campaignId, user) {
  if (!campaignId || typeof campaignId !== 'string') throw new HttpError(400, 'Missing campaign.');
  const snap = await admin.db.collection('campaigns').doc(campaignId).get();
  if (!snap.exists) throw new HttpError(404, 'Campaign page not found.');
  const campaign = { id: snap.id, ...snap.data() };
  if (campaign.ownerId !== user.uid && !user.isAdmin) {
    throw new HttpError(403, 'You can only manage billing for your own campaign pages.');
  }
  return campaign;
}

export function tsToMs(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return new Date(value).getTime() || 0;
  if (value._seconds) return value._seconds * 1000;
  if (value.seconds) return value.seconds * 1000;
  return 0;
}

/** Is the campaign currently on Pro (paid, trial or legacy premium)? Mirrors src/utils/billing.js and isProData() in firestore.rules */
export function campaignHasPro(campaign, now = Date.now()) {
  if (!campaign) return false;
  if (tsToMs(campaign.subscription?.currentPeriodEnd) > now) return true;
  if (campaign.packageType === 'trial' && tsToMs(campaign.trialEndsAt) > now) return true;
  if (tsToMs(campaign.premiumFeatures?.['campaign-crm']?.expiresAt) > now) return true;
  return false;
}

/** True while the campaign is Pro only because of the free trial (no paid period). */
export function campaignIsTrialOnly(campaign, now = Date.now()) {
  if (!campaign) return false;
  if (tsToMs(campaign.subscription?.currentPeriodEnd) > now) return false;
  if (tsToMs(campaign.premiumFeatures?.['campaign-crm']?.expiresAt) > now) return false;
  return campaign.packageType === 'trial' && tsToMs(campaign.trialEndsAt) > now;
}

/* ------------------------------------------------------------------ */
/* Provider config                                                      */
/* ------------------------------------------------------------------ */

export function getProviderConfig() {
  const paystackSecret = (process.env.PAYSTACK_SECRET_KEY || '').trim();
  const flwSecret = (process.env.FLW_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY || '').trim();
  return {
    paystack: {
      enabled: !!paystackSecret,
      secret: paystackSecret,
      plans: {
        monthly: (process.env.PAYSTACK_PLAN_MONTHLY || '').trim(),
        yearly: (process.env.PAYSTACK_PLAN_YEARLY || '').trim(),
      },
    },
    flutterwave: {
      // Without the webhook hash every Flutterwave webhook is rejected, so payments made by
      // customers who close the tab would never be applied — treat it as not configured.
      enabled: !!flwSecret && !!(process.env.FLW_WEBHOOK_HASH || process.env.FLW_SECRET_HASH || '').trim(),
      secret: flwSecret,
      webhookHash: (process.env.FLW_WEBHOOK_HASH || process.env.FLW_SECRET_HASH || '').trim(),
    },
  };
}

export function publicBillingConfig() {
  const cfg = getProviderConfig();
  return {
    currency: CURRENCY,
    serverTime: Date.now(),
    providers: {
      paystack: cfg.paystack.enabled,
      flutterwave: cfg.flutterwave.enabled,
    },
    autoRenew: {
      monthly: cfg.paystack.enabled && !!cfg.paystack.plans.monthly,
      yearly: cfg.paystack.enabled && !!cfg.paystack.plans.yearly,
    },
  };
}

export function generateReference(product) {
  const tag = product === 'spotlight' ? 'SPT' : 'PRO';
  const rand = randomBytes(4).toString('hex').toUpperCase();
  return `CH-${tag}-${Date.now().toString(36).toUpperCase()}-${rand}`;
}

async function providerFetch(url, { secret, method = 'GET', body } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

/* ------------------------------------------------------------------ */
/* Checkout                                                              */
/* ------------------------------------------------------------------ */

export async function createCheckout({ admin, user, campaign, input, origin }) {
  const provider = input.provider === 'flutterwave' ? 'flutterwave' : 'paystack';
  const cfg = getProviderConfig();
  if (!cfg[provider].enabled) {
    throw new HttpError(400, `${provider === 'paystack' ? 'Paystack' : 'Flutterwave'} is not available right now. Try the other payment option.`);
  }

  const product = input.product === 'spotlight' ? 'spotlight' : 'pro';
  const item = resolveProduct({ product, cycle: input.cycle, variantId: input.variantId });
  if (!item) throw new HttpError(400, 'Choose a valid plan.');

  if (product === 'spotlight') {
    const live = campaign.status === 'active' && !campaign.disabled && tsToMs(campaign.endDate) > Date.now();
    if (!live) throw new HttpError(400, 'Your campaign page must be live before you can buy a Spotlight placement.');
    if (tsToMs(campaign.endDate) < Date.now() + item.durationMs) {
      throw new HttpError(400, 'Your page goes offline before this Spotlight would end. Renew Pro first, or choose a shorter Spotlight.');
    }
  }

  let planCode = product === 'pro' && provider === 'paystack' && input.autoRenew
    ? cfg.paystack.plans[item.cycle]
    : '';
  if (planCode && !(await paystackPlanMatches(cfg.paystack.secret, planCode, item))) {
    // A mis-priced plan would overcharge or under-charge the card — fall back to a one-off payment.
    console.error(`[billing] Paystack plan ${planCode} does not match ${item.amount} ${CURRENCY}/${item.cycle}; auto-renew disabled for this checkout.`);
    planCode = '';
  }
  const autoRenew = !!planCode;

  const reference = generateReference(product);
  const email = user.email || campaign.ownerEmail || campaign.contactEmail;
  if (!email) throw new HttpError(400, 'Your account needs an email address to pay.');

  const description = product === 'pro'
    ? `${item.name} for "${campaign.title}"`
    : `${item.name} for "${campaign.title}"`;

  await admin.db.collection('billing_transactions').doc(reference).set({
    reference,
    provider,
    userId: campaign.ownerId,
    paidByUid: user.uid,
    email,
    campaignId: campaign.id,
    campaignTitle: campaign.title || '',
    campaignSlug: campaign.slug || '',
    product,
    cycle: item.cycle || null,
    variantId: product === 'spotlight' ? item.id : null,
    itemName: item.name,
    amount: item.amount,
    currency: CURRENCY,
    autoRenew,
    status: 'initialized',
    createdAt: new Date(),
  });

  const callback = `${origin}/billing/callback?provider=${provider}&campaign=${encodeURIComponent(campaign.id)}`;
  const meta = {
    reference,
    campaignId: campaign.id,
    product,
    cycle: item.cycle || '',
    variantId: product === 'spotlight' ? item.id : '',
    userId: campaign.ownerId,
  };

  if (provider === 'paystack') {
    const body = {
      email,
      amount: Math.round(item.amount * 100),
      currency: CURRENCY,
      reference,
      callback_url: callback,
      channels: autoRenew ? ['card'] : ['mobile_money', 'card'],
      metadata: {
        ...meta,
        custom_fields: [
          { display_name: 'Campaign', variable_name: 'campaign', value: campaign.title || campaign.id },
          { display_name: 'Item', variable_name: 'item', value: item.name },
        ],
      },
    };
    if (planCode) body.plan = planCode;
    const { ok, data } = await providerFetch('https://api.paystack.co/transaction/initialize', {
      secret: cfg.paystack.secret,
      method: 'POST',
      body,
    });
    if (!ok || !data?.status || !data?.data?.authorization_url) {
      await markTransaction(admin, reference, { status: 'failed', failureReason: data?.message || 'init_failed' });
      throw new HttpError(502, data?.message || 'Paystack could not start the payment. Please try again.');
    }
    await markTransaction(admin, reference, { providerAccessCode: data.data.access_code || null });
    return { url: data.data.authorization_url, reference, provider };
  }

  const { ok, data } = await providerFetch('https://api.flutterwave.com/v3/payments', {
    secret: cfg.flutterwave.secret,
    method: 'POST',
    body: {
      tx_ref: reference,
      amount: item.amount,
      currency: CURRENCY,
      redirect_url: callback,
      payment_options: 'mobilemoneyghana,card',
      customer: {
        email,
        name: user.name || campaign.ownerName || campaign.candidateName || 'CampaignHub customer',
        phonenumber: campaign.contactPhone || undefined,
      },
      customizations: {
        title: 'CampaignHub',
        description,
        logo: `${origin}/logo.png`,
      },
      meta,
    },
  });
  if (!ok || data?.status !== 'success' || !data?.data?.link) {
    await markTransaction(admin, reference, { status: 'failed', failureReason: data?.message || 'init_failed' });
    throw new HttpError(502, data?.message || 'Flutterwave could not start the payment. Please try again.');
  }
  return { url: data.data.link, reference, provider };
}

const PAYSTACK_INTERVAL = { monthly: 'monthly', yearly: 'annually' };
const planCheckCache = new Map();

/** Paystack charges the PLAN's amount, not ours — make sure the dashboard plan matches the catalog. */
async function paystackPlanMatches(secret, planCode, item) {
  const key = `${planCode}:${item.amount}:${item.cycle}`;
  const cached = planCheckCache.get(key);
  if (cached && Date.now() - cached.at < 10 * 60000) return cached.ok;
  let ok = false;
  try {
    const { ok: httpOk, data } = await providerFetch(`https://api.paystack.co/plan/${encodeURIComponent(planCode)}`, { secret });
    const plan = data?.data;
    ok = !!(httpOk && plan
      && Number(plan.amount) === Math.round(item.amount * 100)
      && String(plan.currency || '').toUpperCase() === CURRENCY
      && (!plan.interval || plan.interval === PAYSTACK_INTERVAL[item.cycle]));
  } catch {
    ok = false;
  }
  planCheckCache.set(key, { ok, at: Date.now() });
  return ok;
}

async function markTransaction(admin, reference, fields) {
  await admin.db.collection('billing_transactions').doc(reference).set(
    { ...fields, updatedAt: new Date() },
    { merge: true },
  );
}

/* ------------------------------------------------------------------ */
/* Verification with the provider                                       */
/* ------------------------------------------------------------------ */

/** Returns a normalized payment record, or { paid: false } */
export async function verifyWithProvider({ provider, reference, transactionId }) {
  const cfg = getProviderConfig();

  if (provider === 'paystack') {
    if (!cfg.paystack.enabled) throw new HttpError(400, 'Paystack is not configured.');
    if (!reference) throw new HttpError(400, 'Missing payment reference.');
    const { ok, data } = await providerFetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { secret: cfg.paystack.secret },
    );
    if (!ok || !data?.status || !data.data) {
      return { paid: false, status: 'unknown', message: data?.message || 'Could not verify payment' };
    }
    const d = data.data;
    return {
      paid: d.status === 'success',
      status: d.status,
      provider: 'paystack',
      reference: d.reference,
      amount: Number(d.amount || 0) / 100,
      currency: d.currency,
      channel: d.channel || null,
      paidAt: d.paid_at || d.paidAt || null,
      providerTransactionId: String(d.id || ''),
      customerCode: d.customer?.customer_code || null,
      customerId: d.customer?.id || null,
      planCode: (typeof d.plan === 'object' && d.plan ? d.plan.plan_code : d.plan)
        || d.plan_object?.plan_code
        || null,
      authorizationReusable: !!d.authorization?.reusable,
      cardLast4: d.authorization?.last4 || null,
      metadata: typeof d.metadata === 'object' ? d.metadata : null,
    };
  }

  if (provider === 'flutterwave') {
    if (!cfg.flutterwave.enabled) throw new HttpError(400, 'Flutterwave is not configured.');
    const url = transactionId
      ? `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`
      : `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`;
    const { ok, data } = await providerFetch(url, { secret: cfg.flutterwave.secret });
    if (!ok || data?.status !== 'success' || !data.data) {
      return { paid: false, status: 'unknown', message: data?.message || 'Could not verify payment' };
    }
    const d = data.data;
    if (reference && d.tx_ref && d.tx_ref !== reference) {
      return { paid: false, status: 'mismatch', message: 'Payment reference mismatch' };
    }
    return {
      paid: d.status === 'successful',
      status: d.status,
      provider: 'flutterwave',
      reference: d.tx_ref,
      amount: Number(d.amount || 0),
      chargedAmount: Number(d.charged_amount || d.amount || 0),
      currency: d.currency,
      channel: d.payment_type || null,
      paidAt: d.created_at || null,
      providerTransactionId: String(d.id || ''),
      metadata: d.meta || null,
    };
  }

  throw new HttpError(400, 'Unknown payment provider.');
}

/* ------------------------------------------------------------------ */
/* Fulfilment (idempotent)                                              */
/* ------------------------------------------------------------------ */

function accountRefFor(db, campaignId) {
  return db.collection('billing_accounts').doc(campaignId);
}

/**
 * New Pro period after a verified payment.
 * - Stacks on time already paid for (and on a running trial), never on the auto-renew buffer,
 *   so monthly card renewals do not drift into free days.
 * - Never shortens a public page that legacy hosting already paid for.
 */
function computeProUpdate(campaign, account, plan, { now, provider, reference, autoRenew, payment }) {
  const sub = campaign.subscription || {};
  const prevPaidThrough = tsToMs(sub.paidThrough) || tsToMs(sub.currentPeriodEnd);
  const trialEnd = campaign.packageType === 'trial' ? tsToMs(campaign.trialEndsAt) : 0;
  const base = Math.max(now, prevPaidThrough, trialEnd);
  const paidThrough = base + plan.days * DAY_MS;

  // A one-off MoMo payment made while a Paystack card subscription is running keeps that subscription on.
  const keepsCardRenewal = !!sub.autoRenew && !!(account?.paystackPlanCode || account?.paystackSubscriptionCode);
  const renews = !!autoRenew || keepsCardRenewal;
  const periodEnd = paidThrough + (renews ? AUTO_RENEW_BUFFER_DAYS * DAY_MS : 0);
  const publicUntil = Math.max(periodEnd + GRACE_DAYS * DAY_MS, tsToMs(campaign.endDate));

  const keepStatus = ['disabled', 'rejected', 'suspended', 'deleted'].includes(campaign.status) || campaign.disabled === true;
  const subscription = {
    plan: 'pro',
    status: 'active',
    cycle: plan.cycle,
    amount: plan.amount,
    currency: CURRENCY,
    provider,
    currentPeriodStart: new Date(base),
    currentPeriodEnd: new Date(periodEnd),
    paidThrough: new Date(paidThrough),
    lastPaymentAt: new Date(now),
    autoRenew: renews,
    updatedAt: new Date(now),
  };

  const accountUpdate = {
    campaignId: campaign.id,
    ownerId: campaign.ownerId,
    autoRenew: renews,
    lastReference: reference,
    lastPaymentAt: new Date(now),
    updatedAt: new Date(now),
  };
  if (provider === 'paystack') {
    if (payment?.customerCode) accountUpdate.paystackCustomerCode = payment.customerCode;
    if (payment?.customerId) accountUpdate.paystackCustomerId = payment.customerId;
    if (autoRenew && payment?.planCode) accountUpdate.paystackPlanCode = payment.planCode;
    if (payment?.cardLast4 && payment?.channel === 'card') accountUpdate.cardLast4 = payment.cardLast4;
  }

  const startMs = tsToMs(campaign.startDate) || now;
  return {
    periodEnd,
    accountUpdate,
    update: {
      subscription,
      packageType: 'pro',
      packageName: 'CampaignHub Pro',
      packagePrice: plan.amount,
      paymentVerified: true,
      status: keepStatus ? campaign.status : 'active',
      startDate: new Date(startMs),
      endDate: new Date(publicUntil),
      expiresAt: new Date(publicUntil),
      durationDays: Math.round((publicUntil - startMs) / DAY_MS),
      updatedAt: new Date(now),
    },
  };
}

function computeSpotlightUpdate(campaign, pkg, now) {
  const currentEnd = campaign.boostActive ? tsToMs(campaign.boostExpiresAt) : 0;
  const base = Math.max(now, currentEnd);
  const expiresAt = base + pkg.durationMs;
  const update = {
    boostActive: true,
    boostType: pkg.id,
    boostName: pkg.name,
    boostPriority: Math.max(pkg.priority, campaign.boostActive ? campaign.boostPriority || 0 : 0),
    boostExpiresAt: new Date(expiresAt),
    updatedAt: new Date(now),
  };
  if (pkg.featured) {
    update.featured = true;
    update.featuredFromBoost = true;
  }
  return { expiresAt, update };
}

/**
 * Apply a verified payment exactly once. Safe to call many times for the same reference
 * (redirect + webhook + retries all call it): once a transaction has fulfilledAt it is final.
 */
export async function fulfillPayment(admin, payment) {
  const { db } = admin;
  const txRef = db.collection('billing_transactions').doc(payment.reference);
  const now = Date.now();

  const result = await db.runTransaction(async (t) => {
    const txSnap = await t.get(txRef);
    if (!txSnap.exists) {
      return { ok: false, reason: 'unknown_reference' };
    }
    const tx = txSnap.data();
    if (tx.fulfilledAt) {
      return { ok: true, already: true, tx };
    }
    if (tx.provider && payment.provider && tx.provider !== payment.provider) {
      return { ok: false, reason: 'provider_mismatch' };
    }

    const campaignRef = db.collection('campaigns').doc(tx.campaignId);
    const accountRef = accountRefFor(db, tx.campaignId);
    const campaignSnap = await t.get(campaignRef);
    const accountSnap = await t.get(accountRef);

    if ((payment.currency || '').toUpperCase() !== CURRENCY) {
      t.set(txRef, { status: 'failed', failureReason: 'currency_mismatch', updatedAt: new Date(now) }, { merge: true });
      return { ok: false, reason: 'currency_mismatch' };
    }
    if (Number(payment.amount) + 0.001 < Number(tx.amount)) {
      t.set(txRef, { status: 'failed', failureReason: 'amount_mismatch', amountPaid: payment.amount, updatedAt: new Date(now) }, { merge: true });
      return { ok: false, reason: 'amount_mismatch' };
    }
    if (!campaignSnap.exists) {
      t.set(txRef, { status: 'paid_unfulfilled', failureReason: 'campaign_missing', updatedAt: new Date(now) }, { merge: true });
      return { ok: false, reason: 'campaign_missing' };
    }
    const campaign = { id: campaignSnap.id, ...campaignSnap.data() };
    const account = accountSnap.exists ? accountSnap.data() : null;

    let summary = {};
    if (tx.product === 'pro') {
      const plan = getProPlan(tx.cycle);
      if (!plan) return { ok: false, reason: 'bad_plan' };
      const autoRenew = !!tx.autoRenew && payment.provider === 'paystack' && !!payment.planCode;
      const { periodEnd, update, accountUpdate } = computeProUpdate(campaign, account, plan, {
        now,
        provider: payment.provider,
        reference: payment.reference,
        autoRenew,
        payment,
      });
      t.update(campaignRef, update);
      t.set(accountRef, accountUpdate, { merge: true });
      summary = { periodEnd: new Date(periodEnd), cycle: plan.cycle };
    } else if (tx.product === 'spotlight') {
      const pkg = getSpotlightPackage(tx.variantId);
      if (!pkg) return { ok: false, reason: 'bad_variant' };
      const { expiresAt, update } = computeSpotlightUpdate(campaign, pkg, now);
      t.update(campaignRef, update);
      summary = { boostExpiresAt: new Date(expiresAt) };
    } else {
      return { ok: false, reason: 'bad_product' };
    }

    t.set(txRef, {
      status: 'success',
      amountPaid: payment.amount,
      channel: payment.channel || null,
      paidAt: payment.paidAt ? new Date(payment.paidAt) : new Date(now),
      providerTransactionId: payment.providerTransactionId || null,
      fulfilledAt: new Date(now),
      ...summary,
      updatedAt: new Date(now),
    }, { merge: true });

    const notifRef = db.collection('notifications').doc();
    t.set(notifRef, {
      userId: campaign.ownerId,
      campaignId: campaign.id,
      type: 'payment_success',
      message: tx.product === 'pro'
        ? `Payment received — CampaignHub Pro (${tx.cycle}) is active for "${campaign.title}".`
        : `Payment received — ${tx.itemName} is live for "${campaign.title}".`,
      read: false,
      createdAt: new Date(now),
    });

    return { ok: true, tx: { ...tx, status: 'success' }, summary };
  });

  return result;
}

/**
 * Record that the provider says a checkout is not paid (yet) — only for a checkout we created,
 * with the same provider, that has not been fulfilled. Never creates documents.
 */
export async function markCheckoutNotPaid(admin, { provider, reference, status }) {
  if (!reference) return;
  const ref = admin.db.collection('billing_transactions').doc(reference);
  await admin.db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists) return;
    const tx = snap.data();
    if (tx.fulfilledAt || tx.status === 'success' || tx.provider !== provider) return;
    t.update(ref, {
      status: status === 'abandoned' ? 'abandoned' : status === 'failed' ? 'failed' : 'pending',
      lastCheckedAt: new Date(),
      updatedAt: new Date(),
    });
  });
}

/* ------------------------------------------------------------------ */
/* Paystack subscription renewals (card auto-renew)                     */
/* ------------------------------------------------------------------ */

async function accountsWhere(db, field, value) {
  if (!value) return [];
  const snap = await db.collection('billing_accounts').where(field, '==', value).limit(25).get();
  return snap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));
}

async function campaignsById(db, ids) {
  const out = {};
  await Promise.all(ids.map(async (id) => {
    const snap = await db.collection('campaigns').doc(id).get();
    if (snap.exists) out[id] = { id, ref: snap.ref, ...snap.data() };
  }));
  return out;
}

/** The campaign a renewal charge belongs to: same Paystack customer + plan, the one falling due first. */
async function findRenewalCampaign(db, { customerCode, planCode }) {
  const accounts = (await accountsWhere(db, 'paystackCustomerCode', customerCode))
    .filter((a) => !planCode || a.paystackPlanCode === planCode);
  if (!accounts.length) return null;
  const campaigns = await campaignsById(db, accounts.map((a) => a.id));
  const ranked = accounts
    .filter((a) => campaigns[a.id])
    .sort((a, b) => {
      const aLinked = a.paystackSubscriptionCode && a.autoRenew !== false ? 0 : 1;
      const bLinked = b.paystackSubscriptionCode && b.autoRenew !== false ? 0 : 1;
      if (aLinked !== bLinked) return aLinked - bLinked;
      return tsToMs(campaigns[a.id].subscription?.currentPeriodEnd) - tsToMs(campaigns[b.id].subscription?.currentPeriodEnd);
    });
  return ranked.length ? campaigns[ranked[0].id] : null;
}

/** charge.success for a renewal invoice (Paystack creates its own reference). */
export async function fulfillPaystackRenewal(admin, payment) {
  const { db } = admin;
  const plans = getProviderConfig().paystack.plans;
  const plan = [getProPlan('monthly'), getProPlan('yearly')].find((p) => p && plans[p.cycle] && plans[p.cycle] === payment.planCode);
  const campaign = payment.planCode && plan
    ? await findRenewalCampaign(db, { customerCode: payment.customerCode, planCode: payment.planCode })
    : null;

  const txRef = db.collection('billing_transactions').doc(payment.reference);
  if (!campaign) {
    // Money arrived that we cannot place — keep a record for the admin and let Paystack retry.
    await txRef.create({
      reference: payment.reference,
      provider: 'paystack',
      product: 'pro',
      amount: payment.amount,
      amountPaid: payment.amount,
      currency: payment.currency || CURRENCY,
      status: 'paid_unmatched',
      failureReason: !payment.planCode ? 'no_plan' : !plan ? 'unknown_plan' : 'campaign_not_found',
      paystackCustomerCode: payment.customerCode || null,
      paystackPlanCode: payment.planCode || null,
      renewal: true,
      createdAt: new Date(),
    }).catch(() => {});
    if (payment.planCode && plan) throw new Error(`renewal for ${payment.customerCode} could not be matched yet`);
    return { ok: false, reason: 'unmatched' };
  }

  // create() is idempotent across duplicate webhook deliveries; fulfillPayment then returns `already`.
  await txRef.create({
    reference: payment.reference,
    provider: 'paystack',
    userId: campaign.ownerId,
    campaignId: campaign.id,
    campaignTitle: campaign.title || '',
    campaignSlug: campaign.slug || '',
    product: 'pro',
    cycle: plan.cycle,
    variantId: null,
    itemName: `${plan.name} (auto-renewal)`,
    amount: plan.amount,
    currency: CURRENCY,
    autoRenew: true,
    renewal: true,
    status: 'initialized',
    createdAt: new Date(),
  }).catch(async (err) => {
    const existing = await txRef.get();
    if (!existing.exists) throw err;
    if (existing.data().status === 'paid_unmatched' && !existing.data().fulfilledAt) {
      await txRef.set({
        userId: campaign.ownerId,
        campaignId: campaign.id,
        campaignTitle: campaign.title || '',
        campaignSlug: campaign.slug || '',
        cycle: plan.cycle,
        itemName: `${plan.name} (auto-renewal)`,
        amount: plan.amount,
        currency: CURRENCY,
        autoRenew: true,
        status: 'initialized',
        failureReason: null,
      }, { merge: true });
    }
  });

  return fulfillPayment(admin, payment);
}

/** subscription.create — store the subscription code + email token so auto-renew can be cancelled. */
export async function linkPaystackSubscription(admin, data) {
  const code = data.subscription_code;
  if (!code) return { ok: false, reason: 'no_code' };
  const already = await accountsWhere(admin.db, 'paystackSubscriptionCode', code);
  if (already.length) return { ok: true, already: true };

  const planCode = data.plan?.plan_code;
  const candidates = (await accountsWhere(admin.db, 'paystackCustomerCode', data.customer?.customer_code))
    .filter((a) => a.autoRenew === true && !a.paystackSubscriptionCode && (!planCode || a.paystackPlanCode === planCode))
    .sort((a, b) => tsToMs(b.lastPaymentAt) - tsToMs(a.lastPaymentAt));
  if (!candidates.length) {
    // Usually the first charge has not been applied yet — a 500 makes Paystack send this again.
    throw new Error(`subscription ${code} has no matching campaign yet`);
  }
  await candidates[0].ref.set({
    paystackSubscriptionCode: code,
    paystackEmailToken: data.email_token || null,
    nextPaymentDate: data.next_payment_date ? new Date(data.next_payment_date) : null,
    updatedAt: new Date(),
  }, { merge: true });
  return { ok: true };
}

/** subscription.disable / subscription.not_renew */
export async function markPaystackSubscriptionStopped(admin, data) {
  let accounts = await accountsWhere(admin.db, 'paystackSubscriptionCode', data.subscription_code);
  if (!accounts.length) {
    accounts = (await accountsWhere(admin.db, 'paystackCustomerCode', data.customer?.customer_code))
      .filter((a) => a.autoRenew === true && !a.paystackSubscriptionCode && a.paystackPlanCode === data.plan?.plan_code);
  }
  if (!accounts.length) return { ok: false, reason: 'campaign_not_found' };
  const account = accounts[0];
  await account.ref.set({ autoRenew: false, updatedAt: new Date() }, { merge: true });
  await admin.db.collection('campaigns').doc(account.id).update({
    'subscription.autoRenew': false,
    updatedAt: new Date(),
  }).catch(() => {});
  return { ok: true };
}

async function disablePaystackSubscription(secret, code, token) {
  const { ok, data } = await providerFetch('https://api.paystack.co/subscription/disable', {
    secret,
    method: 'POST',
    body: { code, token },
  });
  // Already-disabled subscriptions are fine.
  if (!ok && !/already|not active|inactive/i.test(data?.message || '')) {
    throw new HttpError(502, 'Could not cancel auto-renew with Paystack. Try again in a minute.');
  }
}

/** Stop card auto-renew for one campaign page — at Paystack first, then locally. */
export async function cancelAutoRenew(admin, campaign) {
  const cfg = getProviderConfig();
  const accountRef = accountRefFor(admin.db, campaign.id);
  const accountSnap = await accountRef.get();
  const account = accountSnap.exists ? accountSnap.data() : {};

  if (cfg.paystack.enabled && (account.paystackSubscriptionCode || account.paystackPlanCode)) {
    if (account.paystackSubscriptionCode && account.paystackEmailToken) {
      await disablePaystackSubscription(cfg.paystack.secret, account.paystackSubscriptionCode, account.paystackEmailToken);
    } else if (account.paystackCustomerId) {
      // Subscription not linked yet — look it up at Paystack and disable it there.
      const { ok, data } = await providerFetch(
        `https://api.paystack.co/subscription?customer=${encodeURIComponent(account.paystackCustomerId)}&perPage=50`,
        { secret: cfg.paystack.secret },
      );
      if (!ok || !Array.isArray(data?.data)) {
        throw new HttpError(502, 'Could not reach Paystack to cancel auto-renew. Try again in a minute.');
      }
      const linkedElsewhere = new Set(
        (await accountsWhere(admin.db, 'paystackCustomerCode', account.paystackCustomerCode))
          .filter((a) => a.id !== campaign.id && a.paystackSubscriptionCode)
          .map((a) => a.paystackSubscriptionCode),
      );
      const targets = data.data.filter((s) => s.status === 'active'
        && s.plan?.plan_code === account.paystackPlanCode
        && !linkedElsewhere.has(s.subscription_code));
      for (const s of targets) {
        await disablePaystackSubscription(cfg.paystack.secret, s.subscription_code, s.email_token);
      }
    } else if (campaign.subscription?.autoRenew) {
      throw new HttpError(409, 'Auto-renew is still being set up. Try again in a few minutes.');
    }
  }

  await accountRef.set({ autoRenew: false, updatedAt: new Date() }, { merge: true });
  await admin.db.collection('campaigns').doc(campaign.id).update({
    'subscription.autoRenew': false,
    updatedAt: new Date(),
  });
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Webhook signature checks                                             */
/* ------------------------------------------------------------------ */

export function isValidPaystackSignature(rawBody, signature) {
  const secret = getProviderConfig().paystack.secret;
  if (!secret || !signature) return false;
  const expected = createHmac('sha512', secret).update(rawBody).digest('hex');
  return safeEqual(expected, signature);
}

export function isValidFlutterwaveHash(headerHash) {
  const expected = getProviderConfig().flutterwave.webhookHash;
  if (!expected || !headerHash) return false;
  return safeEqual(expected, headerHash);
}
