/**
 * /api/meta/:action — connect a campaign page to the candidate's own Meta (Facebook/Instagram) ad account.
 *
 *   POST status            → is Meta set up / connected, which ad account (owner)
 *   POST connect           → Facebook login URL with a signed state (owner, Pro)
 *   GET  callback          → Meta redirects here; stores the encrypted token, then back to the Ads page
 *   POST accounts          → ad accounts the candidate allowed (owner)
 *   POST select-account    → choose which ad account this campaign page uses (owner)
 *   POST insights          → campaigns, spend, reach, clicks for 7/30/90 days, cached 15 min (owner, Pro)
 *   POST campaign-status   → pause / resume a Meta campaign in that ad account (owner, Pro)
 *   POST link              → link a Meta campaign to a CampaignHub tracked ad to count supporters (owner)
 *   POST disconnect        → revoke at Meta and forget the token (owner)
 *   POST deauthorize       → Meta "Deauthorize callback" (signed_request)
 *   POST data-deletion     → Meta "Data deletion request callback" (signed_request)
 */
import { loadRuntimeConfig } from '../_lib/runtimeConfig.js';
import { randomBytes } from 'crypto';
import {
  HttpError,
  applyCors,
  sendJson,
  getAppOrigin,
  requireAdminSdk,
  requireUser,
  loadOwnedCampaign,
  campaignHasPro,
  tsToMs,
} from '../_lib/billing.js';
import {
  getMetaConfig,
  signState,
  verifyState,
  encryptToken,
  decryptToken,
  parseSignedRequest,
  graph,
  buildLoginUrl,
  exchangeCodeForToken,
  listAdAccounts,
  fetchAccountInsights,
  translateMetaError,
  META_RANGES,
  META_CACHE_MS,
} from '../_lib/meta.js';

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
      // Meta posts signed_request as a form
      return Object.fromEntries(new URLSearchParams(req.body));
    }
  }
  return {};
}

const callbackUrl = (origin) => `${origin}/api/meta/callback`;
const connRef = (db, campaignId) => db.collection('meta_connections').doc(campaignId);

function publicStatus(conn, cfg) {
  if (!conn) return { configured: cfg.enabled, connected: false };
  return {
    configured: cfg.enabled,
    connected: conn.status === 'connected',
    status: conn.status || 'connected',
    metaUserName: conn.metaUserName || '',
    adAccount: conn.adAccountId
      ? { id: conn.adAccountId, name: conn.adAccountName || conn.adAccountId, currency: conn.currency || '', timezone: conn.timezone || '' }
      : null,
    tokenExpiresAt: tsToMs(conn.tokenExpiresAt) || null,
    links: conn.links || {},
    connectedAt: tsToMs(conn.connectedAt) || null,
  };
}

async function loadConnection(admin, campaignId) {
  const snap = await connRef(admin.db, campaignId).get();
  return snap.exists ? snap.data() : null;
}

async function tokenFor(admin, campaignId, conn) {
  if (!conn || conn.status !== 'connected' || !conn.tokenEnc) {
    throw new HttpError(409, 'Connect your Facebook ad account first.', 'META_NOT_CONNECTED');
  }
  if (tsToMs(conn.tokenExpiresAt) && tsToMs(conn.tokenExpiresAt) < Date.now()) {
    await connRef(admin.db, campaignId).set({ status: 'expired', updatedAt: new Date() }, { merge: true });
    throw new HttpError(409, 'Your Facebook connection has expired. Reconnect your ad account.', 'META_RECONNECT');
  }
  return decryptToken(conn.tokenEnc);
}

async function clearCache(admin, campaignId) {
  await Promise.all(Object.keys(META_RANGES).map((r) => admin.db.collection('meta_cache').doc(`${campaignId}_${r}`).delete().catch(() => {})));
}

/** A Meta error that means the token is dead → remember it so the UI asks to reconnect. */
async function rememberExpiry(admin, campaignId, err) {
  if (err?.code === 'META_RECONNECT') {
    await connRef(admin.db, campaignId).set({ status: 'expired', updatedAt: new Date() }, { merge: true }).catch(() => {});
  }
}

async function forgetMetaUser(admin, metaUserId) {
  if (!metaUserId) return 0;
  const snap = await admin.db.collection('meta_connections').where('metaUserId', '==', String(metaUserId)).get();
  await Promise.all(snap.docs.map(async (d) => {
    await clearCache(admin, d.id);
    await d.ref.delete();
  }));
  return snap.size;
}

export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const action = getAction(req);
  await loadRuntimeConfig();
  const cfg = getMetaConfig();

  /* ---------------- OAuth return from Facebook (browser redirect) ---------------- */
  if (action === 'callback') {
    const origin = getAppOrigin(req);
    const q = req.query || {};
    const state = verifyState(q.state, cfg);
    const back = (campaignId, params) => {
      const target = campaignId ? `/dashboard/${encodeURIComponent(campaignId)}/ads` : '/dashboard';
      res.setHeader('Location', `${origin}${target}?${new URLSearchParams(params).toString()}`);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(302).end();
    };
    if (!cfg.enabled) return back(state?.c, { meta: 'error', reason: 'not_configured' });
    if (!state) return back(null, { meta: 'error', reason: 'expired' });
    if (q.error || !q.code) return back(state.c, { meta: 'error', reason: q.error_reason === 'user_denied' ? 'denied' : 'cancelled' });
    try {
      const admin = await requireAdminSdk();
      const campaignSnap = await admin.db.collection('campaigns').doc(state.c).get();
      if (!campaignSnap.exists || campaignSnap.data().ownerId !== state.u) return back(state.c, { meta: 'error', reason: 'forbidden' });

      const { token, expiresAt } = await exchangeCodeForToken({ code: String(q.code), redirectUri: callbackUrl(origin), cfg });
      const me = await graph('me', { token, cfg, params: { fields: 'id,name' } });
      const perms = await graph('me/permissions', { token, cfg }).catch(() => ({ data: [] }));
      const granted = (perms.data || []).filter((p) => p.status === 'granted').map((p) => p.permission);
      const accounts = await listAdAccounts(token, cfg).catch(() => []);
      const only = accounts.length === 1 ? accounts[0] : null;

      await connRef(admin.db, state.c).set({
        campaignId: state.c,
        ownerId: state.u,
        status: 'connected',
        metaUserId: String(me.id),
        metaUserName: me.name || '',
        tokenEnc: encryptToken(token, cfg),
        tokenExpiresAt: expiresAt ? new Date(expiresAt) : null,
        scopes: granted,
        adAccountId: only ? only.id : null,
        adAccountName: only ? only.name : null,
        currency: only ? only.currency : null,
        timezone: only ? only.timezone : null,
        connectedAt: new Date(),
        updatedAt: new Date(),
      }, { merge: true });
      await clearCache(admin, state.c);
      return back(state.c, { meta: 'connected' });
    } catch (err) {
      console.error('[meta] callback', err);
      return back(state.c, { meta: 'error', reason: 'exchange_failed' });
    }
  }

  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
    const body = getBody(req);
    const admin = await requireAdminSdk();

    /* ---------------- Meta → us (signed_request) ---------------- */
    if (action === 'deauthorize' || action === 'data-deletion') {
      const data = parseSignedRequest(body.signed_request, cfg);
      if (!data?.user_id) throw new HttpError(400, 'Invalid signed_request');
      await forgetMetaUser(admin, data.user_id);
      if (action === 'deauthorize') return sendJson(res, 200, { success: true });
      const code = `CHMETA-${randomBytes(6).toString('hex').toUpperCase()}`;
      await admin.db.collection('meta_deletions').doc(code).set({ metaUserId: String(data.user_id), completedAt: new Date() });
      return sendJson(res, 200, { url: `${getAppOrigin(req)}/support?meta-deletion=${code}`, confirmation_code: code });
    }

    /* ---------------- Owner actions ---------------- */
    const user = await requireUser(req, admin);
    const campaign = await loadOwnedCampaign(admin, body.campaignId, user);
    const conn = await loadConnection(admin, campaign.id);

    if (action === 'status') {
      return sendJson(res, 200, { success: true, data: publicStatus(conn, cfg) });
    }

    if (action === 'connect') {
      if (!cfg.enabled) throw new HttpError(503, 'Facebook ads connection is not switched on yet.', 'META_NOT_CONFIGURED');
      if (!campaignHasPro(campaign) && !user.isAdmin) throw new HttpError(402, 'Connecting Facebook ads is part of CampaignHub Pro.', 'PRO_REQUIRED');
      const state = signState({ c: campaign.id, u: campaign.ownerId }, cfg);
      return sendJson(res, 200, { success: true, data: { url: buildLoginUrl({ state, redirectUri: callbackUrl(getAppOrigin(req)), cfg }) } });
    }

    if (action === 'disconnect') {
      if (conn?.tokenEnc) {
        try {
          const token = decryptToken(conn.tokenEnc, cfg);
          await graph('me/permissions', { token, cfg, method: 'DELETE' });
        } catch {
          /* already revoked or expired — forget it anyway */
        }
      }
      await clearCache(admin, campaign.id);
      await connRef(admin.db, campaign.id).delete();
      return sendJson(res, 200, { success: true, data: { connected: false } });
    }

    if (action === 'link') {
      const metaCampaignId = String(body.metaCampaignId || '').replace(/[^\d]/g, '');
      if (!metaCampaignId) throw new HttpError(400, 'Choose a Meta campaign.');
      const adCode = body.adCode ? String(body.adCode).replace(/[^a-z0-9]/g, '').slice(0, 12) : '';
      if (!conn) throw new HttpError(409, 'Connect your Facebook ad account first.', 'META_NOT_CONNECTED');
      const links = { ...(conn.links || {}) };
      if (adCode) links[metaCampaignId] = adCode;
      else delete links[metaCampaignId];
      await connRef(admin.db, campaign.id).set({ links, updatedAt: new Date() }, { merge: true });
      return sendJson(res, 200, { success: true, data: { links } });
    }

    const token = await tokenFor(admin, campaign.id, conn);

    try {
      if (action === 'accounts') {
        const accounts = await listAdAccounts(token, cfg);
        return sendJson(res, 200, { success: true, data: { accounts } });
      }

      if (action === 'select-account') {
        const accounts = await listAdAccounts(token, cfg);
        const chosen = accounts.find((a) => a.id === body.adAccountId);
        if (!chosen) throw new HttpError(400, 'That ad account is not available. Reconnect and allow access to it.');
        await connRef(admin.db, campaign.id).set({
          adAccountId: chosen.id,
          adAccountName: chosen.name,
          currency: chosen.currency,
          timezone: chosen.timezone,
          links: {},
          updatedAt: new Date(),
        }, { merge: true });
        await clearCache(admin, campaign.id);
        return sendJson(res, 200, { success: true, data: publicStatus({ ...conn, adAccountId: chosen.id, adAccountName: chosen.name, currency: chosen.currency, timezone: chosen.timezone, links: {} }, cfg) });
      }

      if (!conn.adAccountId) throw new HttpError(409, 'Choose which ad account this campaign uses.', 'META_NO_ACCOUNT');
      if (!campaignHasPro(campaign) && !user.isAdmin) throw new HttpError(402, 'Facebook ad results are part of CampaignHub Pro.', 'PRO_REQUIRED');

      if (action === 'insights') {
        const range = META_RANGES[body.range] ? body.range : '30d';
        const cacheRef = admin.db.collection('meta_cache').doc(`${campaign.id}_${range}`);
        if (!body.refresh) {
          const cached = await cacheRef.get();
          if (cached.exists && cached.data().adAccountId === conn.adAccountId && Date.now() - tsToMs(cached.data().fetchedAt) < META_CACHE_MS) {
            return sendJson(res, 200, { success: true, data: { ...cached.data().data, fetchedAt: tsToMs(cached.data().fetchedAt), cached: true, links: conn.links || {} } });
          }
        }
        const data = await fetchAccountInsights({ token, adAccountId: conn.adAccountId, range, currency: conn.currency, cfg });
        const fetchedAt = new Date();
        await cacheRef.set({ adAccountId: conn.adAccountId, data, fetchedAt }).catch(() => {});
        return sendJson(res, 200, { success: true, data: { ...data, fetchedAt: fetchedAt.getTime(), cached: false, links: conn.links || {} } });
      }

      if (action === 'campaign-status') {
        const metaCampaignId = String(body.metaCampaignId || '').replace(/[^\d]/g, '');
        const status = body.status === 'ACTIVE' ? 'ACTIVE' : body.status === 'PAUSED' ? 'PAUSED' : '';
        if (!metaCampaignId || !status) throw new HttpError(400, 'Choose a campaign and whether to pause or resume it.');
        // Only campaigns in the ad account this page is connected to.
        const info = await graph(metaCampaignId, { token, cfg, params: { fields: 'account_id,name' } });
        if (`act_${info.account_id}` !== conn.adAccountId) throw new HttpError(403, 'That campaign is not in your connected ad account.');
        await graph(metaCampaignId, { token, cfg, method: 'POST', params: { status } });
        await clearCache(admin, campaign.id);
        return sendJson(res, 200, { success: true, data: { id: metaCampaignId, status } });
      }
    } catch (err) {
      const friendly = translateMetaError(err);
      await rememberExpiry(admin, campaign.id, friendly);
      throw friendly;
    }

    throw new HttpError(404, 'Unknown action');
  } catch (err) {
    const known = err instanceof HttpError;
    const status = known ? err.status : 500;
    if (status >= 500) console.error('[meta]', action, err);
    return sendJson(res, status, {
      success: false,
      message: known ? err.message : 'Something went wrong talking to Meta. Please try again in a minute.',
      code: known ? err.code : 'SERVER_ERROR',
    });
  }
}
