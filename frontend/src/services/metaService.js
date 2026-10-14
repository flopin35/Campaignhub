import api from './api';

/** Meta (Facebook & Instagram) ad account connection — all calls go through /api/meta (token stays on the server). */
async function post(action, body) {
  const res = await api.post(`/meta/${action}`, body);
  if (res.data?.success === false) throw new Error(res.data?.message || 'Meta request failed');
  return res.data?.data;
}

export const getMetaStatus = (campaignId) => post('status', { campaignId });

/** Sends the browser to Facebook's login; Meta returns to /api/meta/callback and then to the Ads page. */
export async function startMetaConnect(campaignId) {
  const data = await post('connect', { campaignId });
  if (!data?.url) throw new Error('Could not start the Facebook connection.');
  window.location.assign(data.url);
}

export const listMetaAccounts = (campaignId) => post('accounts', { campaignId });
export const selectMetaAccount = (campaignId, adAccountId) => post('select-account', { campaignId, adAccountId });
export const getMetaInsights = (campaignId, range = '30d', refresh = false) => post('insights', { campaignId, range, refresh });
export const setMetaCampaignStatus = (campaignId, metaCampaignId, status) => post('campaign-status', { campaignId, metaCampaignId, status });
export const linkMetaCampaign = (campaignId, metaCampaignId, adCode) => post('link', { campaignId, metaCampaignId, adCode });
export const disconnectMeta = (campaignId) => post('disconnect', { campaignId });

export const META_CONNECT_ERRORS = {
  denied: 'You cancelled the Facebook permission screen. Connect again and tap “Continue” to allow access.',
  cancelled: 'The Facebook connection was cancelled.',
  expired: 'The Facebook connection took too long. Please try again.',
  forbidden: 'Only the campaign owner can connect an ad account.',
  exchange_failed: 'Facebook did not finish the connection. Please try again.',
  not_configured: 'Facebook ads connection is not switched on yet.',
};
