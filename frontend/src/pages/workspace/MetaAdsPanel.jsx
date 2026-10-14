import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  RefreshCw,
  Pause,
  Play,
  ExternalLink,
  Unplug,
  Wallet,
  Users,
  MousePointerClick,
  TrendingUp,
  UserPlus,
  Eye,
  ShieldCheck,
  CircleAlert,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, Button, Badge, Segmented, Skeleton, Alert, Menu, MenuItem } from '../../components/ui';
import { StatTile, LineChart } from '../../components/charts';
import { FacebookIcon } from '../../components/BrandIcons';
import {
  getMetaStatus,
  startMetaConnect,
  listMetaAccounts,
  selectMetaAccount,
  getMetaInsights,
  setMetaCampaignStatus,
  linkMetaCampaign,
  disconnectMeta,
  META_CONNECT_ERRORS,
} from '../../services/metaService';
import { compactNumber, formatNumber, timeAgo, cn } from '../../utils/format';

const RANGES = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
];

const STATUS_TONE = { ACTIVE: 'success', PAUSED: 'neutral', DELETED: 'neutral', ARCHIVED: 'neutral', IN_PROCESS: 'info', WITH_ISSUES: 'danger', CAMPAIGN_PAUSED: 'neutral', DISAPPROVED: 'danger', PENDING_REVIEW: 'warning' };
const STATUS_LABEL = { ACTIVE: 'Running', PAUSED: 'Paused', DELETED: 'Deleted', ARCHIVED: 'Archived', IN_PROCESS: 'Starting', WITH_ISSUES: 'Has issues', DISAPPROVED: 'Rejected', PENDING_REVIEW: 'In review', CAMPAIGN_PAUSED: 'Paused' };

function money(value, currency, decimals = 2) {
  const v = Number(value || 0);
  const formatted = v.toLocaleString('en-GH', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return currency === 'GHS' || !currency ? `₵${formatted}` : `${currency} ${formatted}`;
}

function dayLabel(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GH', { day: 'numeric', month: 'short' });
}

/**
 * Facebook & Instagram ad results for this campaign page, from the candidate's own Meta ad account.
 * trackedAds / signupsByCode come from the CampaignHub Ads manager so each Meta campaign can be
 * linked to a tracked link and show real cost per supporter.
 */
export default function MetaAdsPanel({ campaign, trackedAds = [], signupsByCode = {} }) {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState('');
  const [connecting, setConnecting] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      setStatusError('');
      setStatus(await getMetaStatus(campaign.id));
    } catch (err) {
      setStatusError(err.message);
      setStatus({ configured: false, connected: false, unavailable: true });
    }
  }, [campaign.id]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Coming back from Facebook: ?meta=connected | ?meta=error&reason=…
  useEffect(() => {
    const result = params.get('meta');
    if (!result) return;
    if (result === 'connected') toast('Facebook ad account connected', 'success');
    else toast(META_CONNECT_ERRORS[params.get('reason')] || 'The Facebook connection did not finish. Please try again.', 'error');
    navigate(window.location.pathname, { replace: true });
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = async () => {
    setConnecting(true);
    try {
      await startMetaConnect(campaign.id);
    } catch (err) {
      toast(err.message, 'error');
      setConnecting(false);
    }
  };

  if (!status) {
    return (
      <Card>
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-72 max-w-full" />
          </div>
        </div>
      </Card>
    );
  }

  if (!status.configured) {
    return (
      <Card>
        <CardHeader
          icon={FacebookIcon}
          title="Facebook & Instagram ad results"
          subtitle="Connect your Meta ad account to see spend, reach and cost per supporter here — coming soon."
        />
        {isAdmin && (
          <Alert tone="info" title="Admin setup">
            {statusError
              ? `Could not reach the Meta service: ${statusError}`
              : 'Add META_APP_ID and META_APP_SECRET in Vercel to switch this on. Steps are in docs/META_SETUP.md.'}
          </Alert>
        )}
      </Card>
    );
  }

  if (!status.connected) {
    const expired = status.status === 'expired';
    return (
      <Card className="relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <span className="w-12 h-12 rounded-2xl bg-[#1877F2] text-white grid place-items-center shrink-0" aria-hidden>
            <FacebookIcon className="w-6 h-6" />
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="panel-title">{expired ? 'Reconnect your Facebook ad account' : 'See your Facebook & Instagram ads here'}</h3>
            <p className="panel-sub max-w-2xl">
              {expired
                ? 'Facebook connections last about 60 days. Reconnect to keep your ad results up to date.'
                : 'Connect the ad account you run campaign ads from. You’ll see spend, reach and clicks for every campaign, pause or resume them, and link each one to a tracked ad to get your real cost per supporter.'}
            </p>
            <ul className="mt-3 grid sm:grid-cols-3 gap-2 text-xs text-ink-2">
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-success" /> Your own ad account and card</li>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-success" /> Read results, pause & resume</li>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-success" /> Disconnect any time</li>
            </ul>
          </div>
          <Button onClick={connect} loading={connecting} icon={FacebookIcon} className="shrink-0 !bg-[#1877F2] !text-white hover:!bg-[#166FE5]">
            {expired ? 'Reconnect with Facebook' : 'Continue with Facebook'}
          </Button>
        </div>
      </Card>
    );
  }

  if (!status.adAccount) {
    return <AccountPicker campaign={campaign} onChosen={setStatus} onDisconnect={loadStatus} metaUserName={status.metaUserName} />;
  }

  return (
    <ConnectedPanel
      campaign={campaign}
      status={status}
      setStatus={setStatus}
      reloadStatus={loadStatus}
      trackedAds={trackedAds}
      signupsByCode={signupsByCode}
    />
  );
}

function AccountPicker({ campaign, onChosen, onDisconnect, metaUserName }) {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState(null);
  const [busy, setBusy] = useState('');

  useEffect(() => {
    listMetaAccounts(campaign.id)
      .then((d) => setAccounts(d.accounts || []))
      .catch((err) => {
        toast(err.message, 'error');
        setAccounts([]);
      });
  }, [campaign.id, toast]);

  const choose = async (a) => {
    setBusy(a.id);
    try {
      onChosen(await selectMetaAccount(campaign.id, a.id));
      toast(`Using ${a.name}`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy('');
    }
  };

  const disconnect = async () => {
    await disconnectMeta(campaign.id).catch(() => {});
    onDisconnect();
  };

  return (
    <Card>
      <CardHeader
        icon={FacebookIcon}
        title="Choose the ad account for this campaign"
        subtitle={metaUserName ? `Connected as ${metaUserName}. Pick the ad account you run this campaign’s ads from.` : 'Pick the ad account you run this campaign’s ads from.'}
        action={<Button size="sm" variant="ghost" icon={Unplug} onClick={disconnect}>Disconnect</Button>}
      />
      {accounts == null ? (
        <div className="space-y-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : accounts.length === 0 ? (
        <Alert tone="warning" title="No ad accounts were shared">
          Reconnect and, on the Facebook screen, tick the ad account you want CampaignHub to use. You need an ad account in Meta Business Suite first.
        </Alert>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {accounts.map((a) => (
            <button
              key={a.id}
              type="button"
              disabled={!!busy}
              onClick={() => choose(a)}
              className="text-left rounded-xl border border-line hover:border-link hover:bg-surface-2 p-4 transition-colors disabled:opacity-60"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-semibold text-ink truncate">{a.name}</span>
                {!a.active && <Badge tone="warning">Not active</Badge>}
              </span>
              <span className="block text-xs text-ink-3 mt-1 num">
                {a.id} · {a.currency}{a.business ? ` · ${a.business}` : ''}
              </span>
              {busy === a.id && <span className="block text-xs text-link mt-1">Saving…</span>}
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

function ConnectedPanel({ campaign, status, setStatus, reloadStatus, trackedAds, signupsByCode }) {
  const { toast } = useToast();
  const [range, setRange] = useState('30d');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [links, setLinks] = useState(status.links || {});
  const currency = status.adAccount.currency || data?.currency || 'GHS';

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    setError('');
    try {
      const d = await getMetaInsights(campaign.id, range, refresh);
      setData(d);
      if (d.links) setLinks(d.links);
    } catch (err) {
      setError(err.message);
      if (err.code === 'META_RECONNECT' || err.code === 'META_NOT_CONNECTED') reloadStatus();
    } finally {
      setLoading(false);
    }
  }, [campaign.id, range, reloadStatus]);

  useEffect(() => {
    load(false);
  }, [load]);

  const adsByCode = useMemo(() => Object.fromEntries(trackedAds.map((a) => [a.code, a])), [trackedAds]);

  const rows = useMemo(() => (data?.campaigns || []).map((c) => {
    const code = links[c.id] || '';
    const supporters = code ? Number(signupsByCode[code] || 0) : null;
    return { ...c, code, supporters, cps: supporters ? c.spend / supporters : null };
  }), [data, links, signupsByCode]);

  const linkedSupporters = rows.reduce((s, r) => s + (r.supporters || 0), 0);
  const linkedSpend = rows.reduce((s, r) => s + (r.code ? r.spend : 0), 0);
  const totals = data?.totals;
  const series = (data?.daily || []).map((d) => ({ x: d.date, key: d.date, value: d.spend }));

  const toggleCampaign = async (row) => {
    const next = row.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    if (next === 'ACTIVE' && !window.confirm(`Resume “${row.name}”? It will start spending your budget again.`)) return;
    setBusyId(row.id);
    try {
      await setMetaCampaignStatus(campaign.id, row.id, next);
      toast(next === 'PAUSED' ? 'Campaign paused on Facebook' : 'Campaign resumed on Facebook', 'success');
      setData((d) => ({ ...d, campaigns: d.campaigns.map((c) => (c.id === row.id ? { ...c, status: next, effectiveStatus: next } : c)) }));
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusyId('');
    }
  };

  const changeLink = async (row, code) => {
    setLinks((l) => {
      const n = { ...l };
      if (code) n[row.id] = code;
      else delete n[row.id];
      return n;
    });
    try {
      const d = await linkMetaCampaign(campaign.id, row.id, code);
      setLinks(d.links || {});
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const disconnect = async () => {
    if (!window.confirm('Disconnect your Facebook ad account? Your Meta ads keep running — CampaignHub just stops reading them.')) return;
    try {
      await disconnectMeta(campaign.id);
      setStatus({ configured: true, connected: false });
      toast('Facebook ad account disconnected', 'info');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const adsManagerUrl = `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${encodeURIComponent(String(status.adAccount.id).replace(/^act_/, ''))}`;
  const expiresSoon = status.tokenExpiresAt && status.tokenExpiresAt - Date.now() < 7 * 86400000;

  return (
    <Card pad={false} className="overflow-hidden">
      <div className="p-5 sm:p-6 pb-4 flex flex-col lg:flex-row lg:items-start gap-4 lg:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-10 h-10 rounded-xl bg-[#1877F2] text-white grid place-items-center shrink-0" aria-hidden>
            <FacebookIcon className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h3 className="panel-title">Facebook & Instagram ads</h3>
            <p className="panel-sub truncate">
              {status.adAccount.name} · {currency}
              {data?.fetchedAt ? ` · updated ${timeAgo(data.fetchedAt)}` : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented size="sm" value={range} onChange={setRange} options={RANGES} />
          <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => load(true)} loading={loading}>Refresh</Button>
          <Button size="sm" variant="secondary" href={adsManagerUrl} target="_blank" rel="noopener noreferrer" icon={ExternalLink}>Ads Manager</Button>
          <Menu
            align="right"
            trigger={({ toggle }) => (
              <Button size="sm" variant="ghost" onClick={toggle} aria-label="More">•••</Button>
            )}
          >
            <MenuItem icon={RefreshCw} onClick={() => setStatus({ ...status, adAccount: null })}>Change ad account</MenuItem>
            <MenuItem icon={Unplug} onClick={disconnect}>Disconnect Facebook</MenuItem>
          </Menu>
        </div>
      </div>

      <div className="px-5 sm:px-6 space-y-4">
        {expiresSoon && (
          <Alert tone="warning" icon={CircleAlert} title="Facebook connection expires soon">
            Reconnect within a few days to keep your ad results updating.
          </Alert>
        )}
        {error && (
          <Alert tone="danger" icon={CircleAlert} title="Couldn’t load your Facebook ads" action={<Button size="sm" variant="secondary" onClick={() => load(true)}>Try again</Button>}>
            {error}
          </Alert>
        )}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatTile label="Spend" value={totals ? money(totals.spend, currency) : '—'} icon={Wallet} sub={`Last ${range.replace('d', ' days')}`} />
          <StatTile label="Reach" value={totals ? compactNumber(totals.reach) : '—'} icon={Users} sub={totals ? `${formatNumber(totals.impressions)} impressions` : ''} />
          <StatTile label="Link clicks" value={totals ? formatNumber(totals.linkClicks) : '—'} icon={MousePointerClick} sub={totals ? `${Number(totals.ctr || 0).toFixed(2)}% CTR` : ''} />
          <StatTile label="Cost per click" value={totals && totals.linkClicks ? money(totals.spend / totals.linkClicks, currency) : '—'} icon={TrendingUp} />
          <StatTile label="Supporters from Meta" value={formatNumber(linkedSupporters)} icon={UserPlus} sub={linkedSpend ? 'From linked campaigns' : 'Link campaigns below'} />
          <StatTile label="Cost per supporter" value={linkedSupporters ? money(linkedSpend / linkedSupporters, currency) : '—'} icon={TrendingUp} accent />
        </div>
      </div>

      <div className="px-5 sm:px-6 pt-5">
        <p className="text-sm font-semibold text-ink mb-2">Daily spend</p>
        {data == null && loading ? (
          <Skeleton className="h-[200px]" />
        ) : series.length ? (
          <LineChart data={series} height={200} valueLabel={`Spend (${currency})`} format={(v) => money(v, currency)} xFormat={dayLabel} />
        ) : (
          <p className="text-sm text-ink-3 py-6">No spend in this period.</p>
        )}
      </div>

      <div className="mt-5 border-t border-line">
        {data == null && loading ? (
          <div className="p-5 space-y-2">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-ink-3">No campaigns in this ad account yet. Create one in Ads Manager — it will appear here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Meta campaign</th>
                  <th>Status</th>
                  <th className="text-right">Spend</th>
                  <th className="text-right">Reach</th>
                  <th className="text-right">Link clicks</th>
                  <th>Tracked ad</th>
                  <th className="text-right">Supporters</th>
                  <th className="text-right">Cost / supporter</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const canToggle = r.status === 'ACTIVE' || r.status === 'PAUSED';
                  return (
                    <tr key={r.id}>
                      <td>
                        <span className="font-medium text-ink block">{r.name}</span>
                        <span className="text-xs text-ink-3 flex flex-wrap items-center gap-1.5 mt-0.5">
                          {r.dailyBudget ? `${money(r.dailyBudget, currency, 0)}/day` : r.lifetimeBudget ? `${money(r.lifetimeBudget, currency, 0)} total` : 'Budget set on ad sets'}
                          {r.political && <Badge tone="info" className="h-5 text-[10px]" icon={ShieldCheck}>Political</Badge>}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Badge tone={STATUS_TONE[r.effectiveStatus] || STATUS_TONE[r.status] || 'neutral'}>
                            {STATUS_LABEL[r.effectiveStatus] || STATUS_LABEL[r.status] || r.effectiveStatus}
                          </Badge>
                          {canToggle && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-icon h-8 w-8"
                              onClick={() => toggleCampaign(r)}
                              disabled={busyId === r.id}
                              title={r.status === 'ACTIVE' ? 'Pause on Facebook' : 'Resume on Facebook'}
                              aria-label={r.status === 'ACTIVE' ? `Pause ${r.name}` : `Resume ${r.name}`}
                            >
                              {r.status === 'ACTIVE' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="text-right num">{money(r.spend, currency)}</td>
                      <td className="text-right num">{formatNumber(r.reach)}</td>
                      <td className="text-right num">
                        {formatNumber(r.linkClicks)}
                        <span className="block text-[11px] text-ink-3">{r.ctr ? `${r.ctr.toFixed(2)}%` : ''}</span>
                      </td>
                      <td>
                        <select
                          className="input input-sm h-8 text-xs w-[170px]"
                          value={r.code}
                          onChange={(e) => changeLink(r, e.target.value)}
                          aria-label={`Tracked ad for ${r.name}`}
                        >
                          <option value="">Not linked</option>
                          {trackedAds.map((a) => (
                            <option key={a.code} value={a.code}>{a.name}</option>
                          ))}
                          {r.code && !adsByCode[r.code] && <option value={r.code}>{r.code}</option>}
                        </select>
                      </td>
                      <td className="text-right num">{r.supporters == null ? '—' : formatNumber(r.supporters)}</td>
                      <td className={cn('text-right num', r.cps != null && 'font-semibold text-ink')}>{r.cps != null ? money(r.cps, currency) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="p-5 sm:p-6 border-t border-line bg-surface-2/50 text-xs text-ink-3 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 max-w-3xl">
          <Eye className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
          <span>
            To count supporters, use a CampaignHub tracked link as the website in your Meta ad, then link the campaign above.
            Election ads must use Meta’s “Issues, elections or politics” category and your authorised “Paid for by” disclaimer.
          </span>
        </p>
        <a className="text-link font-medium whitespace-nowrap inline-flex items-center gap-1" href="https://www.facebook.com/business/help/208949576550051" target="_blank" rel="noopener noreferrer">
          Political ads authorisation <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </Card>
  );
}
