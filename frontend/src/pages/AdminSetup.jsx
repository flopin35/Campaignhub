import { useCallback, useEffect, useState } from 'react';
import { CircleCheck, Circle, ShieldCheck, Database, CreditCard, KeyRound, Copy, Rocket } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { Card, CardHeader, Button, Input, Alert, Badge, Spinner, useCopy } from '../components/ui';
import { formatDateTime } from '../utils/format';

async function call(action, body = {}) {
  const res = await api.post(`/admin/${action}`, body, { timeout: 58000 });
  if (res.data?.success === false) throw new Error(res.data.message);
  return res.data?.data;
}

const FIELDS = [
  { key: 'PAYSTACK_SECRET_KEY', label: 'Paystack secret key', placeholder: 'sk_live_…', secret: true, help: 'Paystack → Settings → API Keys & Webhooks' },
  { key: 'FLW_SECRET_KEY', label: 'Flutterwave secret key (optional)', placeholder: 'FLWSECK-…', secret: true, help: 'Flutterwave → Settings → API keys' },
  { key: 'OPENAI_API_KEY', label: 'OpenAI key for AI Studio (optional)', placeholder: 'sk-…', secret: true },
  { key: 'GEMINI_API_KEY', label: 'Gemini key for AI Studio (optional)', placeholder: 'AIza…', secret: true },
  { key: 'META_APP_ID', label: 'Meta App ID (optional)', placeholder: '1234567890' },
  { key: 'META_APP_SECRET', label: 'Meta App Secret (optional)', placeholder: '32 characters', secret: true },
  { key: 'APP_URL', label: 'Site address', placeholder: 'https://www.campaignhubgh.com' },
];

function Step({ done, title, children, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-4 border-b border-line last:border-b-0">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {done ? <CircleCheck className="w-5 h-5 text-success shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-ink-3 shrink-0 mt-0.5" />}
        <div className="min-w-0">
          <p className="font-medium text-ink">{title}</p>
          <div className="text-sm text-ink-3 mt-0.5">{children}</div>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Admin → Setup: finish going live from the browser — keys, security rules, data clean-up, Paystack plans. */
export default function AdminSetup() {
  const { toast } = useToast();
  const { copy, copied } = useCopy();
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState('');
  const [report, setReport] = useState(null);

  const load = useCallback(async () => {
    try {
      setError('');
      setStatus(await call('status'));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (name, fn, okMsg) => {
    setBusy(name);
    try {
      const out = await fn();
      if (okMsg) toast(okMsg, 'success');
      await load();
      return out;
    } catch (err) {
      toast(err.message, 'error');
      return null;
    } finally {
      setBusy('');
    }
  };

  const save = () => run('save', async () => {
    await call('save-settings', { values });
    setValues({});
  }, 'Keys saved securely');

  const finishAll = () => run('all', async () => {
    if (Object.values(values).some(Boolean)) {
      await call('save-settings', { values });
      setValues({});
    }
    await call('deploy-rules');
    setReport(await call('run-upgrade', { apply: true }));
    if (status?.settings?.PAYSTACK_SECRET_KEY?.set || values.PAYSTACK_SECRET_KEY) await call('create-plans').catch(() => null);
  }, 'Setup finished');

  if (error) {
    return (
      <Alert tone="danger" title="Setup is not reachable">
        {error}
        {/firebase admin|credential|not configured/i.test(error) && ' — add FIREBASE_SERVICE_ACCOUNT (the Firebase service-account JSON) in Vercel → Settings → Environment Variables, redeploy, then open this tab again.'}
      </Alert>
    );
  }
  if (!status) return <Card><div className="flex items-center gap-3 text-sm text-ink-3"><Spinner /> Loading setup…</div></Card>;

  const s = status.settings;
  const paystackOk = s.PAYSTACK_SECRET_KEY.set;

  return (
    <div className="grid xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
      <div className="space-y-6">
        <Card>
          <CardHeader icon={Rocket} title="Go live" subtitle="Saves your keys, publishes the security rules, cleans up old data and creates the Paystack plans." action={<Button icon={Rocket} onClick={finishAll} loading={busy === 'all'}>Finish setup</Button>} />
          <Step done={paystackOk} title="Payment keys saved">
            {paystackOk ? `Paystack ${s.PAYSTACK_SECRET_KEY.hint} (${s.PAYSTACK_SECRET_KEY.source === 'vercel' ? 'from Vercel' : 'saved in CampaignHub'})` : 'Paste your Paystack secret key below.'}
          </Step>
          <Step
            done={!!status.setup.rulesDeployedAt}
            title="Security rules published"
            action={<Button size="sm" variant="secondary" icon={ShieldCheck} onClick={() => run('rules', () => call('deploy-rules'), 'Security rules are live')} loading={busy === 'rules'}>Publish</Button>}
          >
            {status.setup.rulesDeployedAt ? `Published ${formatDateTime(status.setup.rulesDeployedAt)}` : 'Protects voter data, payments and uploads.'}
          </Step>
          <Step
            done={!!status.setup.upgradeAppliedAt}
            title="Old data cleaned up"
            action={(
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => run('check', async () => setReport(await call('run-upgrade', { apply: false })))} loading={busy === 'check'}>Check</Button>
                <Button size="sm" variant="secondary" icon={Database} onClick={() => run('upgrade', async () => setReport(await call('run-upgrade', { apply: true })), 'Data cleaned up')} loading={busy === 'upgrade'}>Clean up</Button>
              </div>
            )}
          >
            {status.setup.upgradeAppliedAt ? `Done ${formatDateTime(status.setup.upgradeAppliedAt)}` : 'Suspends old hidden pages, fixes dates, removes public owner e-mails.'}
          </Step>
          <Step
            done={s.PAYSTACK_PLAN_MONTHLY.set && s.PAYSTACK_PLAN_YEARLY.set}
            title="Card auto-renew plans"
            action={<Button size="sm" variant="secondary" icon={CreditCard} disabled={!paystackOk} onClick={() => run('plans', () => call('create-plans'), 'Paystack plans ready')} loading={busy === 'plans'}>Create</Button>}
          >
            {s.PAYSTACK_PLAN_MONTHLY.set ? `${s.PAYSTACK_PLAN_MONTHLY.hint} (₵120/month) · ${s.PAYSTACK_PLAN_YEARLY.hint} (₵1,200/year)` : 'Lets customers pay by card automatically every month or year.'}
          </Step>
        </Card>

        {report && (
          <Card>
            <CardHeader title={report.applied ? 'Clean-up done' : 'Data check'} subtitle={`${report.counts?.campaigns ?? 0} campaigns checked`} />
            <ul className="text-sm text-ink-2 space-y-1.5">
              <li>Old-style hidden pages suspended: <b>{report.fixes.suspended.length}</b></li>
              <li>Events made public: <b>{report.fixes.eventsMadePublic}</b></li>
              <li>Back-dated pages fixed: <b>{report.fixes.createdAtReset.length}</b></li>
              <li>Owner e-mails removed from public pages: <b>{report.fixes.ownerEmailRemoved}</b></li>
              <li>Deleted campaign ids locked: <b>{report.fixes.tombstones?.length || 0}</b></li>
              <li>Pro with no payment on record: <b>{report.unbackedLegacyPro.length + report.unbackedSubscriptions.length}</b>{report.unbackedLegacyPro.length + report.unbackedSubscriptions.length ? ' — review below' : ''}</li>
              <li>Suspicious trials: <b>{report.suspiciousTrials.length}</b></li>
            </ul>
            {[...report.unbackedLegacyPro, ...report.unbackedSubscriptions, ...report.suspiciousTrials].length > 0 && (
              <div className="mt-4 rounded-xl bg-surface-2 p-3 text-xs text-ink-2 space-y-1 max-h-56 overflow-y-auto">
                {[...report.unbackedLegacyPro, ...report.unbackedSubscriptions, ...report.suspiciousTrials].map((r) => <p key={r}>{r}</p>)}
                <Button size="sm" variant="danger-ghost" className="mt-2" onClick={() => window.confirm('End Pro and trials that no payment backs?') && run('strip', async () => setReport(await call('run-upgrade', { apply: true, strip: true })), 'Unpaid Pro removed')}>Remove unpaid Pro</Button>
              </div>
            )}
          </Card>
        )}

        <Card>
          <CardHeader icon={KeyRound} title="Keys" subtitle="Stored on the server only (never in the code, git or the browser). Leave a box empty to keep the current value." />
          <div className="grid sm:grid-cols-2 gap-4">
            {FIELDS.map((f) => (
              <Input
                key={f.key}
                label={f.label}
                type={f.secret ? 'password' : 'text'}
                autoComplete="off"
                placeholder={s[f.key]?.set ? `${s[f.key].hint || 'set'} — leave empty to keep` : f.placeholder}
                value={values[f.key] || ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                hint={f.help}
              />
            ))}
          </div>
          <Button className="mt-5" onClick={save} loading={busy === 'save'} disabled={!Object.values(values).some(Boolean)}>Save keys</Button>
        </Card>
      </div>

      <Card>
        <CardHeader title="Paste these into the provider dashboards" subtitle="These can only be set on their websites." />
        {[
          ['Paystack → Settings → API Keys & Webhooks → Webhook URL', status.urls.paystackWebhook],
          ['Flutterwave → Settings → Webhooks → URL', status.urls.flutterwaveWebhook],
          ...(s.FLW_WEBHOOK_HASH.set ? [['Flutterwave → Settings → Webhooks → Secret hash', s.FLW_WEBHOOK_HASH.hint]] : []),
          ['Meta → Facebook Login for Business → Valid OAuth Redirect URIs', status.urls.metaRedirect],
          ['Meta → Deauthorize callback URL', status.urls.metaDeauthorize],
          ['Meta → App settings → Data deletion callback URL', status.urls.metaDataDeletion],
        ].map(([label, url]) => (
          <div key={label} className="py-3 border-b border-line last:border-b-0">
            <p className="text-xs text-ink-3">{label}</p>
            <div className="flex items-center gap-2 mt-1">
              <code className="text-xs text-ink break-all flex-1">{url}</code>
              {url && (
                <button type="button" className="btn btn-ghost btn-icon h-8 w-8" onClick={() => copy(url, label)} aria-label="Copy">
                  <Copy className={copied === label ? 'w-4 h-4 text-success' : 'w-4 h-4'} />
                </button>
              )}
            </div>
          </div>
        ))}
        <div className="mt-4 flex flex-wrap gap-2">
          {['PAYSTACK_SECRET_KEY', 'FLW_SECRET_KEY', 'META_APP_ID', 'OPENAI_API_KEY', 'GEMINI_API_KEY'].map((k) => (
            <Badge key={k} tone={s[k].set ? 'success' : 'neutral'}>{k.replace(/_/g, ' ').toLowerCase()}</Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}
