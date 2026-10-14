/**
 * Meta (Facebook & Instagram) Marketing API connection for each campaign page.
 *
 * Flow: the owner clicks "Connect" → Facebook login (Facebook Login for Business) → Meta redirects to
 * /api/meta/callback with a code → we swap it for a long-lived user token (≈60 days), encrypt it with
 * AES-256-GCM and keep it in Firestore where only this server can read it (meta_connections/{campaignId}).
 * The browser never sees the token. Every Graph call carries appsecret_proof.
 *
 * Firestore (server-only — firestore.rules denies all client access):
 *   meta_connections/{campaignId}  token (encrypted), Meta user, chosen ad account, links to tracked ads
 *   meta_cache/{campaignId}_{range} short-lived insights cache (keeps us far below Meta rate limits)
 */
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { HttpError } from './billing.js';

export const META_SCOPES = ['ads_read', 'ads_management', 'business_management'];
export const META_RANGES = { '7d': 'last_7d', '30d': 'last_30d', '90d': 'last_90d' };
const CACHE_MS = 15 * 60 * 1000;
const STATE_TTL_MS = 15 * 60 * 1000;
/** Currencies Meta reports budgets for without decimal places. */
const ZERO_DECIMAL = new Set(['CLP', 'COP', 'CRC', 'HUF', 'ISK', 'IDR', 'JPY', 'KRW', 'PYG', 'TWD', 'VND']);

export function getMetaConfig() {
  const appId = (process.env.META_APP_ID || '').trim();
  const appSecret = (process.env.META_APP_SECRET || '').trim();
  const keySource = (process.env.META_TOKEN_KEY || '').trim() || appSecret;
  return {
    enabled: !!(appId && appSecret),
    appId,
    appSecret,
    configId: (process.env.META_LOGIN_CONFIG_ID || '').trim(),
    version: (process.env.META_GRAPH_VERSION || 'v26.0').trim(),
    // 32-byte AES key; a dedicated META_TOKEN_KEY is recommended, the app secret is the fallback.
    tokenKey: keySource ? createHash('sha256').update(`campaignhub-meta-token:${keySource}`).digest() : null,
    stateKey: appSecret ? createHash('sha256').update(`campaignhub-meta-state:${appSecret}`).digest() : null,
  };
}

/* ------------------------------------------------------------------ */
/* Small crypto helpers                                                 */
/* ------------------------------------------------------------------ */

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

function safeEqualBuf(a, b) {
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Signed, expiring `state` so the OAuth callback knows which campaign and user started the login. */
export function signState(payload, cfg = getMetaConfig()) {
  const body = b64url(JSON.stringify({ ...payload, exp: Date.now() + STATE_TTL_MS, n: b64url(randomBytes(9)) }));
  const sig = b64url(createHmac('sha256', cfg.stateKey).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyState(state, cfg = getMetaConfig()) {
  const [body, sig] = String(state || '').split('.');
  if (!body || !sig || !cfg.stateKey) return null;
  const expected = createHmac('sha256', cfg.stateKey).update(body).digest();
  if (!safeEqualBuf(expected, fromB64url(sig))) return null;
  try {
    const data = JSON.parse(fromB64url(body).toString('utf8'));
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function encryptToken(token, cfg = getMetaConfig()) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', cfg.tokenKey, iv);
  const ct = Buffer.concat([cipher.update(String(token), 'utf8'), cipher.final()]);
  return `v1.${b64url(iv)}.${b64url(cipher.getAuthTag())}.${b64url(ct)}`;
}

export function decryptToken(blob, cfg = getMetaConfig()) {
  const [v, iv, tag, ct] = String(blob || '').split('.');
  if (v !== 'v1' || !iv || !tag || !ct) throw new HttpError(409, 'Reconnect your Facebook ad account.', 'META_RECONNECT');
  try {
    const decipher = createDecipheriv('aes-256-gcm', cfg.tokenKey, fromB64url(iv));
    decipher.setAuthTag(fromB64url(tag));
    return Buffer.concat([decipher.update(fromB64url(ct)), decipher.final()]).toString('utf8');
  } catch {
    throw new HttpError(409, 'Reconnect your Facebook ad account.', 'META_RECONNECT');
  }
}

/** Meta's signed_request (deauthorize / data-deletion callbacks). */
export function parseSignedRequest(signed, cfg = getMetaConfig()) {
  const [sig, payload] = String(signed || '').split('.');
  if (!sig || !payload || !cfg.appSecret) return null;
  const expected = createHmac('sha256', cfg.appSecret).update(payload).digest();
  if (!safeEqualBuf(expected, fromB64url(sig))) return null;
  try {
    const data = JSON.parse(fromB64url(payload).toString('utf8'));
    return String(data.algorithm || '').toUpperCase() === 'HMAC-SHA256' ? data : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Graph API                                                            */
/* ------------------------------------------------------------------ */

export class MetaError extends Error {
  constructor(message, { code, subcode, status, type } = {}) {
    super(message);
    this.code = code;
    this.subcode = subcode;
    this.status = status;
    this.type = type;
  }
}

function friendlyMetaError(err) {
  if (err.code === 190 || err.code === 102 || err.type === 'OAuthException' && /session|token/i.test(err.message)) {
    return new HttpError(409, 'Your Facebook connection has expired. Reconnect your ad account.', 'META_RECONNECT');
  }
  if ([4, 17, 32, 613, 80000, 80003, 80004, 80014].includes(err.code)) {
    return new HttpError(429, 'Meta is limiting requests right now. Try again in a few minutes.', 'META_RATE_LIMIT');
  }
  if ([10, 200, 294, 278].includes(err.code) || (err.code >= 200 && err.code < 300)) {
    return new HttpError(403, 'Meta has not given CampaignHub permission for this ad account. Reconnect and allow access to it.', 'META_PERMISSION');
  }
  return new HttpError(502, `Meta said: ${String(err.message || 'request failed').slice(0, 200)}`, 'META_ERROR');
}

export async function graph(path, { token, method = 'GET', params = {}, cfg = getMetaConfig() } = {}) {
  const url = new URL(path.startsWith('http') ? path : `https://graph.facebook.com/${cfg.version}/${path.replace(/^\//, '')}`);
  const query = { ...params };
  if (token) {
    query.access_token = token;
    query.appsecret_proof = createHmac('sha256', cfg.appSecret).update(token).digest('hex');
  }
  let body;
  if (method === 'GET' || method === 'DELETE') {
    Object.entries(query).forEach(([k, v]) => v !== undefined && url.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v)));
  } else {
    body = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => v !== undefined && body.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v)));
  }
  const res = await fetch(url, {
    method,
    body,
    headers: body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : undefined,
    signal: AbortSignal.timeout(20000),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok || data?.error) {
    const e = data?.error || {};
    throw new MetaError(e.message || `Graph request failed (${res.status})`, {
      code: e.code,
      subcode: e.error_subcode,
      status: res.status,
      type: e.type,
    });
  }
  return data;
}

/** Follow paging.next (max 5 pages) and return all rows. */
async function graphAll(path, opts) {
  const out = [];
  let page = await graph(path, opts);
  for (let i = 0; i < 5; i += 1) {
    out.push(...(page?.data || []));
    const next = page?.paging?.next;
    if (!next) break;
    // eslint-disable-next-line no-await-in-loop
    page = await graph(next, { ...opts, params: {} });
  }
  return out;
}

export function buildLoginUrl({ state, redirectUri, cfg = getMetaConfig() }) {
  const url = new URL(`https://www.facebook.com/${cfg.version}/dialog/oauth`);
  url.searchParams.set('client_id', cfg.appId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('response_type', 'code');
  if (cfg.configId) {
    // Facebook Login for Business configuration (chooses permissions + assets in the Meta dashboard)
    url.searchParams.set('config_id', cfg.configId);
    url.searchParams.set('override_default_response_type', 'true');
  } else {
    url.searchParams.set('scope', META_SCOPES.join(','));
  }
  return url.toString();
}

/** code → short-lived token → long-lived token (≈60 days). */
export async function exchangeCodeForToken({ code, redirectUri, cfg = getMetaConfig() }) {
  const short = await graph('oauth/access_token', {
    cfg,
    params: { client_id: cfg.appId, client_secret: cfg.appSecret, redirect_uri: redirectUri, code },
  });
  let token = short.access_token;
  let expiresIn = Number(short.expires_in || 0);
  try {
    const long = await graph('oauth/access_token', {
      cfg,
      params: { grant_type: 'fb_exchange_token', client_id: cfg.appId, client_secret: cfg.appSecret, fb_exchange_token: token },
    });
    if (long.access_token) {
      token = long.access_token;
      expiresIn = Number(long.expires_in || 0) || 60 * 86400;
    }
  } catch {
    /* keep the short-lived token; the owner will be asked to reconnect sooner */
  }
  return { token, expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null };
}

export async function listAdAccounts(token, cfg = getMetaConfig()) {
  const rows = await graphAll('me/adaccounts', {
    token,
    cfg,
    params: { fields: 'id,account_id,name,account_status,currency,timezone_name,business{name}', limit: 100 },
  });
  return rows.map((a) => ({
    id: a.id,
    accountId: a.account_id,
    name: a.name || a.id,
    currency: a.currency || '',
    timezone: a.timezone_name || '',
    business: a.business?.name || '',
    active: Number(a.account_status) === 1,
    status: Number(a.account_status),
  }));
}

function minorToMajor(value, currency) {
  if (value === undefined || value === null || value === '') return null;
  return ZERO_DECIMAL.has(String(currency).toUpperCase()) ? Number(value) : Number(value) / 100;
}

const num = (v) => (v === undefined || v === null || v === '' ? 0 : Number(v) || 0);

/** Campaigns + insights for one ad account, merged and summed. */
export async function fetchAccountInsights({ token, adAccountId, range = '30d', currency = '', cfg = getMetaConfig() }) {
  const preset = META_RANGES[range] || META_RANGES['30d'];
  const fields = 'spend,impressions,reach,clicks,inline_link_clicks,ctr,cpc,cpm,frequency';
  const [campaigns, perCampaign, daily, totalRows] = await Promise.all([
    graphAll(`${adAccountId}/campaigns`, {
      token,
      cfg,
      params: {
        fields: 'id,name,status,effective_status,objective,daily_budget,lifetime_budget,special_ad_categories,start_time,stop_time',
        limit: 100,
      },
    }),
    graphAll(`${adAccountId}/insights`, {
      token,
      cfg,
      params: { level: 'campaign', fields: `campaign_id,campaign_name,${fields}`, date_preset: preset, limit: 200 },
    }),
    graphAll(`${adAccountId}/insights`, {
      token,
      cfg,
      params: { fields: 'spend,impressions,inline_link_clicks,reach', date_preset: preset, time_increment: 1, limit: 100 },
    }),
    graphAll(`${adAccountId}/insights`, { token, cfg, params: { fields, date_preset: preset } }),
  ]);

  const statsById = Object.fromEntries(perCampaign.map((r) => [r.campaign_id, r]));
  const rows = campaigns.map((c) => {
    const s = statsById[c.id] || {};
    return {
      id: c.id,
      name: c.name,
      status: c.status,
      effectiveStatus: c.effective_status,
      objective: c.objective || '',
      political: Array.isArray(c.special_ad_categories) && c.special_ad_categories.includes('ISSUES_ELECTIONS_POLITICS'),
      dailyBudget: minorToMajor(c.daily_budget, currency),
      lifetimeBudget: minorToMajor(c.lifetime_budget, currency),
      spend: num(s.spend),
      impressions: num(s.impressions),
      reach: num(s.reach),
      clicks: num(s.clicks),
      linkClicks: num(s.inline_link_clicks),
      ctr: num(s.ctr),
      cpc: num(s.cpc),
      cpm: num(s.cpm),
    };
  });
  // Campaigns that spent in the period but were since deleted still count toward totals.
  perCampaign.forEach((s) => {
    if (!rows.some((r) => r.id === s.campaign_id)) {
      rows.push({
        id: s.campaign_id,
        name: s.campaign_name || s.campaign_id,
        status: 'DELETED',
        effectiveStatus: 'DELETED',
        objective: '',
        political: false,
        dailyBudget: null,
        lifetimeBudget: null,
        spend: num(s.spend),
        impressions: num(s.impressions),
        reach: num(s.reach),
        clicks: num(s.clicks),
        linkClicks: num(s.inline_link_clicks),
        ctr: num(s.ctr),
        cpc: num(s.cpc),
        cpm: num(s.cpm),
      });
    }
  });
  rows.sort((a, b) => b.spend - a.spend || String(a.name).localeCompare(String(b.name)));

  const t = totalRows[0] || {};
  const totals = {
    spend: num(t.spend),
    impressions: num(t.impressions),
    reach: num(t.reach),
    clicks: num(t.clicks),
    linkClicks: num(t.inline_link_clicks),
    ctr: num(t.ctr),
    cpc: num(t.cpc),
    cpm: num(t.cpm),
    frequency: num(t.frequency),
  };
  const series = daily
    .map((d) => ({ date: d.date_start, spend: num(d.spend), impressions: num(d.impressions), linkClicks: num(d.inline_link_clicks), reach: num(d.reach) }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  return { range, preset, currency, totals, campaigns: rows, daily: series };
}

export function translateMetaError(err) {
  if (err instanceof HttpError) return err;
  if (err instanceof MetaError) return friendlyMetaError(err);
  return err;
}

export const META_CACHE_MS = CACHE_MS;
