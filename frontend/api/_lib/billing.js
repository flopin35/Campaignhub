/**
 * Server-side billing core: Paystack + Flutterwave checkout, verification and
 * idempotent fulfilment into Firestore (via Firebase Admin, which bypasses rules).
 *
 * Firestore writes:
 *   billing_transactions/{reference}  — one doc per checkout (server-only writes)
 *   campaigns/{id}.subscription        — Pro status for that campaign page
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
    return {
      uid: decoded.uid,
      email: (decoded.email || '').toLowerCase(),
      name: decoded.name || '',
      isAdmin: (decoded.email || '').toLowerCase() === ADMIN_EMAIL,
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

/** Is the campaign currently on Pro (paid, trial or legacy premium)? Mirrors src/utils/billing.js */
export function campaignHasPro(campaign, now = Date.now()) {
  if (!campaign) return false;
  if (tsToMs(campaign.subscription?.currentPeriodEnd) > now) return true;
  if (campaign.packageType === 'trial' && tsToMs(campaign.trialEndsAt || campaign.endDate) > now) return true;
  if (tsToMs(campaign.premiumFeatures?.['campaign-crm']?.expiresAt) > now) return true;
  return false;
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
      enabled: !!flwSecret,
      secret: flwSecret,
      webhookHash: (process.env.FLW_WEBHOOK_HASH || process.env.FLW_SECRET_HASH || '').trim(),
    },
  };
}

export function publicBillingConfig() {
  const cfg = getProviderConfig();
  return {
    currency: CURRENCY,
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
  }

  const planCode = product === 'pro' && provider === 'paystack' && input.autoRenew
    ? cfg.paystack.plans[item.cycle]
    : '';
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

function computeProUpdate(campaign, plan, { now, provider, reference, autoRenew, payment }) {
  const sub = campaign.subscription || {};
  const candidates = [now, tsToMs(sub.currentPeriodEnd)];
  if (campaign.packageType === 'trial') candidates.push(tsToMs(campaign.trialEndsAt || campaign.endDate));
  const base = Math.max(...candidates);
  const extra = autoRenew ? AUTO_RENEW_BUFFER_DAYS : 0;
  const periodEnd = base + (plan.days + extra) * DAY_MS;
  const publicUntil = periodEnd + GRACE_DAYS * DAY_MS;

  const keepStatus = ['disabled', 'rejected'].includes(campaign.status);
  const subscription = {
    plan: 'pro',
    status: 'active',
    cycle: plan.cycle,
    amount: plan.amount,
    currency: CURRENCY,
    provider,
    currentPeriodStart: new Date(base),
    currentPeriodEnd: new Date(periodEnd),
    lastReference: reference,
    lastPaymentAt: new Date(now),
    autoRenew: !!autoRenew,
    paystackCustomerCode: payment?.customerCode || sub.paystackCustomerCode || null,
    paystackPlanCode: autoRenew ? (payment?.planCode || sub.paystackPlanCode || null) : (sub.paystackPlanCode || null),
    paystackSubscriptionCode: sub.paystackSubscriptionCode || null,
    paystackEmailToken: sub.paystackEmailToken || null,
    cardLast4: payment?.cardLast4 || sub.cardLast4 || null,
    updatedAt: new Date(now),
  };

  return {
    periodEnd,
    update: {
      subscription,
      packageType: 'pro',
      packageName: 'CampaignHub Pro',
      packagePrice: plan.amount,
      paymentVerified: true,
      status: keepStatus ? campaign.status : 'active',
      ...(keepStatus ? {} : { disabled: false }),
      startDate: campaign.startDate || new Date(now),
      endDate: new Date(publicUntil),
      expiresAt: new Date(publicUntil),
      durationDays: Math.round((publicUntil - tsToMs(campaign.startDate || now)) / DAY_MS),
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
 * Apply a verified payment. Safe to call many times for the same reference
 * (redirect + webhook both call it).
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
    if (tx.status === 'success' && tx.fulfilledAt) {
      return { ok: true, already: true, tx };
    }
    if ((payment.currency || '').toUpperCase() !== CURRENCY) {
      t.set(txRef, { status: 'failed', failureReason: 'currency_mismatch', updatedAt: new Date(now) }, { merge: true });
      return { ok: false, reason: 'currency_mismatch' };
    }
    if (Number(payment.amount) + 0.001 < Number(tx.amount)) {
      t.set(txRef, { status: 'failed', failureReason: 'amount_mismatch', amountPaid: payment.amount, updatedAt: new Date(now) }, { merge: true });
      return { ok: false, reason: 'amount_mismatch' };
    }

    const campaignRef = db.collection('campaigns').doc(tx.campaignId);
    const campaignSnap = await t.get(campaignRef);
    if (!campaignSnap.exists) {
      t.set(txRef, { status: 'paid_unfulfilled', failureReason: 'campaign_missing', updatedAt: new Date(now) }, { merge: true });
      return { ok: false, reason: 'campaign_missing' };
    }
    const campaign = { id: campaignSnap.id, ...campaignSnap.data() };

    let summary = {};
    if (tx.product === 'pro') {
      const plan = getProPlan(tx.cycle);
      if (!plan) return { ok: false, reason: 'bad_plan' };
      const autoRenew = !!tx.autoRenew && payment.provider === 'paystack' && !!payment.planCode;
      const { periodEnd, update } = computeProUpdate(campaign, plan, {
        now,
        provider: payment.provider,
        reference: payment.reference,
        autoRenew,
        payment,
      });
      t.update(campaignRef, update);
      summary = { periodEnd: new Date(periodEnd), cycle: plan.cycle };
    } else if (tx.product === 'spotlight') {
      const pkg = getSpotlightPackage(tx.variantId);
      if (!pkg) return { ok: false, reason: 'bad_variant' };
      const { expiresAt, update } = computeSpotlightUpdate(campaign, pkg, now);
      t.update(campaignRef, update);
      summary = { boostExpiresAt: new Date(expiresAt) };
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

/* ------------------------------------------------------------------ */
/* Paystack subscription renewals (card auto-renew)                     */
/* ------------------------------------------------------------------ */

async function findAutoRenewCampaign(db, { customerCode, planCode, subscriptionCode }) {
  let snap;
  if (subscriptionCode) {
    snap = await db.collection('campaigns')
      .where('subscription.paystackSubscriptionCode', '==', subscriptionCode)
      .limit(5).get();
    if (!snap.empty) return snap.docs[0];
  }
  if (!customerCode) return null;
  snap = await db.collection('campaigns')
    .where('subscription.paystackCustomerCode', '==', customerCode)
    .limit(20).get();
  const matches = snap.docs
    .filter((d) => {
      const s = d.data().subscription || {};
      return (!planCode || s.paystackPlanCode === planCode) && s.autoRenew !== false;
    })
    .sort((a, b) => tsToMs(a.data().subscription?.currentPeriodEnd) - tsToMs(b.data().subscription?.currentPeriodEnd));
  return matches[0] || null;
}

/** charge.success for a renewal invoice (Paystack creates its own reference). */
export async function fulfillPaystackRenewal(admin, payment) {
  const { db } = admin;
  if (!payment.planCode) return { ok: false, reason: 'no_plan' };
  const plan = Object.values({ monthly: getProPlan('monthly'), yearly: getProPlan('yearly') })
    .find((p) => getProviderConfig().paystack.plans[p.cycle] === payment.planCode);
  if (!plan) return { ok: false, reason: 'unknown_plan' };

  const campaignDoc = await findAutoRenewCampaign(db, {
    customerCode: payment.customerCode,
    planCode: payment.planCode,
  });
  if (!campaignDoc) return { ok: false, reason: 'campaign_not_found' };
  const campaign = { id: campaignDoc.id, ...campaignDoc.data() };

  await db.collection('billing_transactions').doc(payment.reference).set({
    reference: payment.reference,
    provider: 'paystack',
    userId: campaign.ownerId,
    email: campaign.ownerEmail || '',
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
  }, { merge: true });

  return fulfillPayment(admin, payment);
}

export async function linkPaystackSubscription(admin, data) {
  const doc = await findAutoRenewCampaign(admin.db, {
    customerCode: data.customer?.customer_code,
    planCode: data.plan?.plan_code,
  });
  if (!doc) return { ok: false, reason: 'campaign_not_found' };
  await doc.ref.update({
    'subscription.paystackSubscriptionCode': data.subscription_code || null,
    'subscription.paystackEmailToken': data.email_token || null,
    'subscription.autoRenew': true,
    'subscription.nextPaymentDate': data.next_payment_date ? new Date(data.next_payment_date) : null,
    updatedAt: new Date(),
  });
  return { ok: true };
}

export async function markPaystackSubscriptionStopped(admin, data) {
  const doc = await findAutoRenewCampaign(admin.db, {
    subscriptionCode: data.subscription_code,
    customerCode: data.customer?.customer_code,
    planCode: data.plan?.plan_code,
  });
  if (!doc) return { ok: false, reason: 'campaign_not_found' };
  await doc.ref.update({
    'subscription.autoRenew': false,
    updatedAt: new Date(),
  });
  return { ok: true };
}

export async function cancelAutoRenew(admin, campaign) {
  const sub = campaign.subscription || {};
  const cfg = getProviderConfig();
  if (sub.paystackSubscriptionCode && sub.paystackEmailToken && cfg.paystack.enabled) {
    const { ok, data } = await providerFetch('https://api.paystack.co/subscription/disable', {
      secret: cfg.paystack.secret,
      method: 'POST',
      body: { code: sub.paystackSubscriptionCode, token: sub.paystackEmailToken },
    });
    if (!ok || !data?.status) {
      throw new HttpError(502, data?.message || 'Could not cancel auto-renew with Paystack. Try again.');
    }
  }
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
