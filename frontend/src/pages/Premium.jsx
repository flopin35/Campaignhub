import { Link } from 'react-router-dom';
import { Check, Minus, Zap, Smartphone, CreditCard, RefreshCw, ShieldCheck } from 'lucide-react';
import PlanCards from '../components/billing/PlanCards';
import { Disclosure } from '../components/ui';
import { SPOTLIGHT_PACKAGES } from '../../api/_lib/billingCatalog.js';
import { formatCedis } from '../utils/billing';

const COMPARE = [
  ['Official campaign page, link & QR code', true],
  ['Voter CRM with import / export', true],
  ['Support levels & path-to-victory projection', true],
  ['Canvassing links for your field team', true],
  ['Polling agents & live results collation', true],
  ['Targeted WhatsApp / SMS / email broadcasts', true],
  ['Ads manager with tracked links & QR codes', true],
  ['AI speechwriter in 8 languages', true],
  ['Events, RSVPs & check-in', true],
  ['MoMo fundraising', true],
  ['Insights & issue polls', true],
  ['Unlimited voters & field links', true],
];

const VALUE = [
  ['A data clerk to type up voter notebooks', '₵1,500+/mo'],
  ['Printing voter lists for every canvasser', '₵400+/mo'],
  ['A results room with phones on election night', '₵2,000+'],
  ['Copywriting for speeches, ads & posts', '₵800+/mo'],
];

const FAQ = [
  ['Is the price per account or per campaign page?', 'Per campaign page. Each page has its own voters, field team, results and plan. Most candidates need just one.'],
  ['Which payment methods can I use?', 'MTN MoMo, Telecel Cash, AT Money, Visa and Mastercard — processed by Paystack or Flutterwave. CampaignHub never sees your PIN or card number.'],
  ['Does it renew automatically?', 'MoMo payments are prepaid for the period you choose (30 days or 365 days) and you renew when you are ready — we remind you before it ends. If you pay by card on Paystack you can turn on automatic renewal and cancel it anytime.'],
  ['Can I pay early?', 'Yes. Paying before your period ends adds the new time on top, so you never lose days.'],
  ['Can I get a refund?', 'See our refund policy. In short: if something goes wrong with a payment we fix it or refund it; unused days of a period that has started are not refunded.'],
  ['What is Spotlight?', 'An optional one-time placement that pins your page to the top of the CampaignHub homepage and directory for a few hours or days. It is separate from Pro.'],
];

export default function Pricing() {
  return (
    <div>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-20 pb-16 text-center">
        <p className="eyebrow">Pricing</p>
        <h1 className="mt-3 text-4xl sm:text-5xl font-extrabold text-ink text-balance max-w-3xl mx-auto">One plan. Every tool. Built for campaigns that intend to win.</h1>
        <p className="mt-5 text-lg text-ink-2 max-w-2xl mx-auto">Start with 7 days free. Then ₵120 a month — or ₵1,200 a year and get two months free.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-ink-3">
          <span className="inline-flex items-center gap-1.5"><Smartphone className="w-4 h-4" /> Mobile money</span>
          <span className="inline-flex items-center gap-1.5"><CreditCard className="w-4 h-4" /> Visa & Mastercard</span>
          <span className="inline-flex items-center gap-1.5"><RefreshCw className="w-4 h-4" /> Optional card auto-renew</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Paystack & Flutterwave</span>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <PlanCards />
      </section>

      <section className="bg-surface border-y border-line">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid lg:grid-cols-2 gap-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ink">Everything in Pro</h2>
            <ul className="mt-6 divide-y divide-line border-y border-line">
              {COMPARE.map(([label, on]) => (
                <li key={label} className="py-3 flex items-center justify-between gap-4 text-[15px]">
                  <span className="text-ink-2">{label}</span>
                  {on ? <Check className="w-5 h-5 text-success" /> : <Minus className="w-5 h-5 text-ink-3" />}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ink">What ₵120 replaces</h2>
            <p className="mt-3 text-ink-2">Typical costs campaigns pay to do the same work by hand (estimates):</p>
            <ul className="mt-6 space-y-3">
              {VALUE.map(([label, cost]) => (
                <li key={label} className="card p-4 flex items-center justify-between gap-4 shadow-none">
                  <span className="text-[15px] text-ink-2">{label}</span>
                  <span className="text-sm font-semibold text-ink whitespace-nowrap line-through decoration-danger/60">{cost}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-accent-soft text-accent-ink flex items-center justify-center"><Zap className="w-5 h-5" /></span>
          <div>
            <h2 className="text-2xl font-extrabold text-ink">Spotlight add-on</h2>
            <p className="text-ink-3 text-sm">Optional, one-time. Pin your page to the top of CampaignHub.</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3">
          {SPOTLIGHT_PACKAGES.map((p) => (
            <div key={p.id} className="card p-4 text-center shadow-none">
              <p className="text-xs text-ink-3">{p.label}</p>
              <p className="text-xl font-extrabold text-ink mt-1">{formatCedis(p.amount)}</p>
              {p.featured && <p className="text-[11px] text-accent-ink font-semibold mt-1">Homepage hero</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-ink text-center mb-8">Billing questions</h2>
        <div className="border-t border-line">
          {FAQ.map(([q, a]) => <Disclosure key={q} title={q}>{a}</Disclosure>)}
        </div>
        <p className="text-center text-sm text-ink-3 mt-8">
          Read the <Link className="text-link" to="/terms">terms</Link> and <Link className="text-link" to="/refunds">refund policy</Link>.
        </p>
      </section>
    </div>
  );
}
