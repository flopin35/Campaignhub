import { useState } from 'react';
import { Lock, Sparkles, Check, Download } from 'lucide-react';
import { Button } from '../ui';
import { CheckoutDialog } from './Checkout';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { canStartTrial, describeBilling } from '../../utils/billing';
import { startTrialForCampaign } from '../../services/campaignFirestoreService';

/**
 * Wrap a Pro module. When the campaign isn't on Pro/trial, show what the tool does
 * and how to unlock it instead of the tool itself.
 */
export default function ProGate({ title, description, bullets = [], children, onExport }) {
  const { campaign, billing } = useWorkspace();
  if (billing.isPro) return children;
  return <LockedPanel campaign={campaign} billing={billing} title={title} description={description} bullets={bullets} onExport={onExport} />;
}

export function LockedPanel({ campaign, billing, title, description, bullets = [], onExport }) {
  const { user, userProfile, setUserProfile } = useAuth();
  const { toast } = useToast();
  const [checkout, setCheckout] = useState(null);
  const [starting, setStarting] = useState(false);
  const trialAvailable = canStartTrial(userProfile, campaign) && billing.state !== 'trialing';

  const startTrial = async () => {
    setStarting(true);
    try {
      await startTrialForCampaign(campaign, user.uid);
      setUserProfile?.((p) => ({ ...(p || {}), trialCampaignId: campaign.id }));
      toast('Your 7-day free trial has started. Every tool is unlocked.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="card overflow-hidden">
      <div className="grid md:grid-cols-[1.2fr_1fr]">
        <div className="p-6 sm:p-8">
          <span className="inline-flex items-center gap-1.5 badge badge-gold">
            <Lock className="w-3.5 h-3.5" /> CampaignHub Pro
          </span>
          <h2 className="mt-4 text-xl sm:text-2xl font-extrabold text-ink">{title}</h2>
          {description && <p className="mt-2 text-[15px] text-ink-2 leading-relaxed">{description}</p>}
          {bullets.length > 0 && (
            <ul className="mt-5 space-y-2.5">
              {bullets.map((b) => (
                <li key={b} className="flex gap-2.5 text-sm text-ink-2">
                  <Check className="w-4 h-4 text-success shrink-0 mt-0.5" /> {b}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-7 flex flex-wrap gap-2">
            {trialAvailable ? (
              <Button variant="gold" icon={Sparkles} onClick={startTrial} loading={starting}>
                Start 7-day free trial
              </Button>
            ) : null}
            <Button variant={trialAvailable ? 'secondary' : 'primary'} onClick={() => setCheckout('monthly')}>
              Subscribe — ₵120/month
            </Button>
            <Button variant="ghost" onClick={() => setCheckout('yearly')}>
              ₵1,200/year (save ₵240)
            </Button>
          </div>
          <p className="mt-4 text-xs text-ink-3">{describeBilling(billing)}</p>
          {onExport && (
            <button type="button" onClick={onExport} className="mt-4 inline-flex items-center gap-1.5 text-xs text-link">
              <Download className="w-3.5 h-3.5" /> Your data is always yours — export it as CSV
            </button>
          )}
        </div>
        <div className="hidden md:block relative bg-surface-2 border-l border-line">
          <div className="absolute inset-0 bg-grid opacity-60" aria-hidden />
          <div className="relative h-full p-8 flex flex-col justify-center gap-3" aria-hidden>
            {[78, 62, 88, 45, 70].map((w, i) => (
              <div key={w} className="card p-3 flex items-center gap-3 shadow-none">
                <span className="w-7 h-7 rounded-full bg-surface-3" />
                <span className="flex-1 space-y-1.5">
                  <span className="block h-2 rounded bg-surface-3" style={{ width: `${w}%` }} />
                  <span className="block h-2 rounded bg-surface-3/70" style={{ width: `${w - 25}%` }} />
                </span>
                <span className="w-12 h-2 rounded" style={{ background: i % 2 ? 'rgb(var(--viz-lean))' : 'rgb(var(--viz-strong))' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <CheckoutDialog open={!!checkout} defaultCycle={checkout || 'monthly'} onClose={() => setCheckout(null)} campaign={campaign} />
    </div>
  );
}
