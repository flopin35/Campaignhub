import { useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Segmented } from '../ui';
import { PRO_PLANS, PRO_FEATURES, formatCedis } from '../../utils/billing';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/format';

/** Marketing plan card with a monthly / yearly switch. */
export default function PlanCards({ compact = false }) {
  const [cycle, setCycle] = useState('yearly');
  const { user } = useAuth();
  const plan = PRO_PLANS[cycle];
  const monthlyEquivalent = cycle === 'yearly' ? Math.round(plan.amount / 12) : plan.amount;
  const features = compact ? PRO_FEATURES.slice(0, 6) : PRO_FEATURES;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-center mb-8">
        <Segmented
          value={cycle}
          onChange={setCycle}
          options={[
            { value: 'monthly', label: 'Monthly' },
            { value: 'yearly', label: <span className="inline-flex items-center gap-1.5">Yearly <span className="badge badge-gold h-5 text-[10px]">2 months free</span></span> },
          ]}
        />
      </div>

      <div className="grid md:grid-cols-[1.15fr_1fr] gap-0 rounded-3xl overflow-hidden border border-line shadow-lift bg-surface">
        <div className="p-7 sm:p-10">
          <p className="eyebrow">CampaignHub Pro</p>
          <div className="mt-4 flex items-end gap-2">
            <span className="text-5xl sm:text-6xl font-extrabold font-display text-ink tracking-tight">{formatCedis(plan.amount)}</span>
            <span className="text-ink-3 mb-2">/ {plan.per}</span>
          </div>
          <p className="text-sm text-ink-3 mt-2">
            {cycle === 'yearly'
              ? `Just ${formatCedis(monthlyEquivalent)}/month — you save ${formatCedis(PRO_PLANS.yearly.savingsAmount)} a year.`
              : 'Billed monthly. Cancel anytime.'}{' '}
            Per campaign page.
          </p>
          <Link
            to={user ? '/dashboard' : '/signup'}
            className="btn btn-lg btn-primary w-full mt-7"
          >
            <Sparkles className="w-[18px] h-[18px]" /> Start 7-day free trial
          </Link>
          <p className="text-xs text-ink-3 mt-3 text-center">No payment for 7 days · Then MoMo or card via Paystack / Flutterwave</p>
        </div>
        <div className="p-7 sm:p-10 bg-surface-2 border-t md:border-t-0 md:border-l border-line">
          <p className="text-sm font-semibold text-ink">Everything included</p>
          <ul className="mt-4 space-y-3">
            {features.map((f) => (
              <li key={f.title} className="flex gap-3">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-success-soft text-success flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </span>
                <span className={cn('text-sm', compact ? 'text-ink' : 'text-ink-2')}>
                  {compact ? f.title : <><strong className="text-ink font-semibold">{f.title}.</strong> {f.text}</>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
