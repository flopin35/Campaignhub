import { useEffect, useState } from 'react';
import { ShieldCheck, Smartphone, CreditCard, Check, RefreshCw } from 'lucide-react';
import { Modal, Button, Segmented, Toggle, Alert } from '../ui';
import { useToast } from '../../context/ToastContext';
import { getBillingConfig, startCheckout } from '../../services/billingService';
import { PRO_PLANS, formatCedis } from '../../utils/billing';
import { SPOTLIGHT_PACKAGES } from '../../../api/_lib/billingCatalog.js';
import { cn } from '../../utils/format';

const PROVIDER_INFO = {
  paystack: { name: 'Paystack', note: 'MTN MoMo, Telecel Cash, AT Money, Visa & Mastercard' },
  flutterwave: { name: 'Flutterwave', note: 'Mobile money & cards' },
};

export function useBillingConfig() {
  const [config, setConfig] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    getBillingConfig({ fresh: attempt > 0 }).then((c) => alive && setConfig(c));
    return () => {
      alive = false;
    };
  }, [attempt]);
  if (config) config.retry = () => {
    setConfig(null);
    setAttempt((n) => n + 1);
  };
  return config;
}

/**
 * Pay for Pro (monthly / yearly) or a Spotlight placement.
 * Redirects to the provider's hosted checkout; /billing/callback finishes the job.
 */
export function CheckoutDialog({ open, onClose, campaign, product = 'pro', defaultCycle = 'monthly', variantId: initialVariant }) {
  const { toast } = useToast();
  const config = useBillingConfig();
  const [cycle, setCycle] = useState(defaultCycle);
  const [variantId, setVariantId] = useState(initialVariant || 'boost-24hr');
  const [provider, setProvider] = useState('paystack');
  const [autoRenew, setAutoRenew] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setCycle(defaultCycle);
      if (initialVariant) setVariantId(initialVariant);
    }
  }, [open, defaultCycle, initialVariant]);

  useEffect(() => {
    if (!config) return;
    if (!config.providers?.[provider]) {
      const first = Object.entries(config.providers || {}).find(([, on]) => on)?.[0];
      if (first) setProvider(first);
    }
  }, [config, provider]);

  const plan = PRO_PLANS[cycle];
  const spot = SPOTLIGHT_PACKAGES.find((p) => p.id === variantId);
  const amount = product === 'pro' ? plan.amount : spot?.amount || 0;
  const canAutoRenew = product === 'pro' && provider === 'paystack' && !!config?.autoRenew?.[cycle];
  const noProviders = config && !config.providers?.paystack && !config.providers?.flutterwave;

  const pay = async () => {
    if (!campaign?.id) return;
    setLoading(true);
    try {
      await startCheckout({
        campaignId: campaign.id,
        product,
        cycle: product === 'pro' ? cycle : undefined,
        variantId: product === 'spotlight' ? variantId : undefined,
        provider,
        autoRenew: canAutoRenew && autoRenew,
      });
    } catch (err) {
      toast(err.message || 'Could not start payment', 'error');
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      dismissible={!loading}
      title={product === 'pro' ? 'Activate CampaignHub Pro' : 'Buy a Spotlight placement'}
      subtitle={campaign?.title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={pay} loading={loading} disabled={!config || noProviders}>
            Pay {formatCedis(amount)}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {product === 'pro' ? (
          <div>
            <p className="label">Billing cycle</p>
            <div className="grid grid-cols-2 gap-3">
              {Object.values(PRO_PLANS).map((p) => (
                <button
                  key={p.cycle}
                  type="button"
                  onClick={() => setCycle(p.cycle)}
                  className={cn(
                    'relative text-left rounded-xl border p-4 transition-colors',
                    cycle === p.cycle ? 'border-primary ring-2 ring-primary/15 bg-primary-soft/40' : 'border-line-strong hover:bg-surface-2',
                  )}
                >
                  {p.savingsLabel && (
                    <span className="absolute -top-2.5 right-3 badge badge-gold h-5 text-[10px]">{p.savingsLabel}</span>
                  )}
                  <span className="block text-sm text-ink-2">{p.shortName}</span>
                  <span className="block mt-1 text-xl font-bold text-ink font-display">
                    {formatCedis(p.amount)}
                    <span className="text-sm font-medium text-ink-3">/{p.per}</span>
                  </span>
                  {p.cycle === 'yearly' && <span className="block text-xs text-success mt-1">Save {formatCedis(p.savingsAmount)}</span>}
                  {p.cycle === 'monthly' && <span className="block text-xs text-ink-3 mt-1">Cancel anytime</span>}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <p className="label">Placement length</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SPOTLIGHT_PACKAGES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setVariantId(p.id)}
                  className={cn(
                    'text-left rounded-xl border px-3 py-2.5 transition-colors',
                    variantId === p.id ? 'border-primary ring-2 ring-primary/15 bg-primary-soft/40' : 'border-line-strong hover:bg-surface-2',
                  )}
                >
                  <span className="block text-xs text-ink-3">{p.label}</span>
                  <span className="block text-base font-bold text-ink">{formatCedis(p.amount)}</span>
                  {p.popular && <span className="text-[10px] font-semibold text-accent-ink">Popular</span>}
                  {p.featured && <span className="text-[10px] font-semibold text-accent-ink">Homepage hero</span>}
                </button>
              ))}
            </div>
            <p className="hint">Your page is pinned to the top of the CampaignHub homepage and directory for the chosen time.</p>
          </div>
        )}

        <div>
          <p className="label">Pay with</p>
          {config?.unavailable ? (
            <Alert
              tone="warning"
              title="Couldn’t load payment options"
              action={<Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => config.retry?.()}>Try again</Button>}
            >
              Check your internet connection and try again.
            </Alert>
          ) : noProviders ? (
            <Alert tone="warning" title="Online payments are being set up">
              Contact campaignhubgh@gmail.com and we&apos;ll activate your plan manually.
            </Alert>
          ) : (
            <div className="space-y-2">
              {['paystack', 'flutterwave'].map((id) => {
                const enabled = config ? !!config.providers?.[id] : true;
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={!enabled}
                    onClick={() => setProvider(id)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors disabled:opacity-50',
                      provider === id ? 'border-primary ring-2 ring-primary/15' : 'border-line-strong hover:bg-surface-2',
                    )}
                  >
                    <span
                      className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                        provider === id ? 'border-primary bg-primary' : 'border-line-strong',
                      )}
                    >
                      {provider === id && <Check className="w-3 h-3 text-primary-fg" strokeWidth={3} />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-ink">{PROVIDER_INFO[id].name}</span>
                      <span className="block text-xs text-ink-3">{enabled ? PROVIDER_INFO[id].note : 'Currently unavailable'}</span>
                    </span>
                    <span className="flex gap-1 text-ink-3">
                      <Smartphone className="w-4 h-4" aria-hidden />
                      <CreditCard className="w-4 h-4" aria-hidden />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {canAutoRenew && (
          <div className="rounded-xl border border-line p-4">
            <Toggle
              checked={autoRenew}
              onChange={setAutoRenew}
              label={
                <span className="inline-flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4" /> Renew automatically with my card
                </span>
              }
              description="Card only. Cancel anytime from Plan & billing. Leave off to pay with MoMo each period."
            />
          </div>
        )}

        <p className="flex items-start gap-2 text-xs text-ink-3">
          <ShieldCheck className="w-4 h-4 shrink-0 text-success" />
          You&apos;ll complete payment on {PROVIDER_INFO[provider]?.name}&apos;s secure page. CampaignHub never sees your PIN or card number.
          {product === 'pro' && ' Paying early adds time on top of your current period — you never lose days.'}
        </p>
      </div>
    </Modal>
  );
}
