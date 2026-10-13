import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Sparkles,
  Users,
  Footprints,
  Vote,
  Target,
  Send,
  Mic,
  CalendarDays,
  HandCoins,
  ChartColumn,
  Globe,
  ShieldCheck,
  Smartphone,
  CircleCheck,
  Radio,
  MapPin,
} from 'lucide-react';
import { Disclosure } from '../components/ui';
import PlanCards from '../components/billing/PlanCards';
import { useCampaigns } from '../hooks/useCampaigns';
import { isBoostActive } from '../utils/campaignHelpers';
import CampaignCard from '../components/CampaignCard';
import { useAuth } from '../context/AuthContext';

const FEATURES = [
  { icon: Users, title: 'Voter CRM', text: 'Every supporter by region, constituency and polling station — strong, leaning, undecided or opposed. Import from Excel in seconds.' },
  { icon: Vote, title: 'Path to victory', text: 'Set your win number. See projected votes rise as your team talks to voters — and which polling stations need work.' },
  { icon: Footprints, title: 'Field team links', text: 'Send each canvasser a private link on WhatsApp. They log door-to-door contacts from any phone. No app, no password.' },
  { icon: Radio, title: 'Election-day collation', text: 'Polling agents submit pink-sheet figures the moment counting ends. Watch your constituency tally build live.' },
  { icon: Target, title: 'Ads that prove themselves', text: 'Tracked links and QR codes for every Facebook ad, radio mention and billboard. Know your cost per supporter.' },
  { icon: Send, title: 'Targeted messaging', text: 'Personalised WhatsApp, SMS and email to exactly the right voters — with templates and bulk-SMS export.' },
  { icon: Mic, title: 'AI speechwriter', text: 'Rally speeches, radio scripts, posts and rebuttals in English, Twi, Ga, Ewe, Hausa, Fante, Dagbani and Pidgin.' },
  { icon: CalendarDays, title: 'Events & rallies', text: 'Publish events with RSVPs, invite on WhatsApp and count attendance at the gate.' },
  { icon: HandCoins, title: 'MoMo fundraising', text: 'A donate button that pays straight into your campaign MoMo, with references, goals and donor lists.' },
  { icon: ChartColumn, title: 'Insights & issue polls', text: 'Daily traffic by source, sign-up conversion, supporter map and a live poll of what voters care about.' },
  { icon: Globe, title: 'Official campaign page', text: 'A fast, mobile-first page with your manifesto, QR code and sign-up forms — plus paid Spotlight placement.' },
  { icon: ShieldCheck, title: 'Your data, protected', text: 'Your voter lists are private to your campaign. Export everything anytime. Non-partisan, built in Ghana.' },
];

const STEPS = [
  { n: '01', title: 'Launch your page', text: 'Two minutes: candidate, office, constituency, message. Your official link and QR code are ready to share.' },
  { n: '02', title: 'Build your voter base', text: 'Import lists, collect sign-ups from your page, and let canvassers add voters door to door.' },
  { n: '03', title: 'Mobilise & persuade', text: 'Target undecided voters by polling station with messages, events and ads you can measure.' },
  { n: '04', title: 'Protect the vote', text: 'On election day, agents report results from every station and you see the full picture first.' },
];

const FAQ = [
  ['How much does CampaignHub Pro cost?', 'GH₵120 per month, or GH₵1,200 per year (two months free). The price is per campaign page and includes every tool — no hidden extras. Spotlight placement on our homepage is an optional add-on.'],
  ['Is there a free trial?', 'Yes. Your first campaign page gets 7 days of full Pro access with no payment. After the trial, choose monthly or yearly to keep your tools and public page running.'],
  ['How do I pay?', 'Securely through Paystack or Flutterwave with MTN MoMo, Telecel Cash, AT Money, Visa or Mastercard. Your plan activates automatically within seconds of payment.'],
  ['What happens if I don’t renew?', 'Your tools pause and your public page stays online for a 3-day grace period. Your data is never deleted — renew anytime and everything is exactly where you left it. You can always export your voter list.'],
  ['Do my canvassers and polling agents need accounts?', 'No. You send each one a private link. They open it on any phone and submit entries. You can pause or delete a link at any time.'],
  ['Is CampaignHub tied to any party?', 'No. CampaignHub is non-partisan and serves candidates from every party as well as independents, at every level — assembly, MMDCE, parliamentary primaries, Parliament and national campaigns.'],
  ['Who can see my voter data?', 'Only you. Supporter lists, results and fundraising records are private to the campaign owner’s account and protected by Firebase security rules.'],
];

function HeroMockup() {
  const bars = [
    { k: 'Strong', w: 38, c: 'rgb(var(--viz-strong))' },
    { k: 'Leaning', w: 24, c: 'rgb(var(--viz-lean))' },
    { k: 'Undecided', w: 26, c: 'rgb(var(--viz-neutral))' },
    { k: 'Opposed', w: 12, c: 'rgb(var(--viz-against))' },
  ];
  const stations = [
    ['Methodist JHS A', 412, 0.81],
    ['Zongo Park', 365, 0.66],
    ['Presby Primary B', 298, 0.58],
    ['Market Square', 241, 0.47],
  ];
  return (
    <div className="relative" aria-hidden>
      <div className="absolute -inset-6 bg-gradient-to-tr from-gold-300/25 via-transparent to-navy-300/25 blur-2xl rounded-[3rem]" />
      <div className="relative card p-5 sm:p-6 shadow-pop">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-ink-3">Path to victory</p>
            <p className="text-3xl font-extrabold font-display text-ink mt-1">18,420</p>
            <p className="text-xs text-ink-3">projected of 21,000 votes to win</p>
          </div>
          <span className="badge badge-success">88%</span>
        </div>
        <div className="mt-4 h-2.5 rounded-full overflow-hidden" style={{ background: 'rgb(var(--viz-track))' }}>
          <div className="h-full rounded-full" style={{ width: '88%', background: 'rgb(var(--viz-1))' }} />
        </div>
        <div className="mt-5 flex h-3 gap-[2px] rounded-[4px] overflow-hidden">
          {bars.map((b) => <div key={b.k} style={{ width: `${b.w}%`, background: b.c }} />)}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-3">
          {bars.map((b) => (
            <span key={b.k} className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: b.c }} />{b.k}</span>
          ))}
        </div>
        <div className="mt-5 pt-4 border-t border-line space-y-2.5">
          {stations.map(([name, n, w]) => (
            <div key={name} className="grid grid-cols-[1fr_auto] gap-3 items-center">
              <div>
                <p className="text-xs text-ink-2 flex items-center gap-1"><MapPin className="w-3 h-3" />{name}</p>
                <div className="mt-1 h-2 rounded-r-[4px]" style={{ width: `${w * 100}%`, background: 'rgb(var(--viz-1))' }} />
              </div>
              <span className="text-xs font-semibold text-ink num">{n}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="hidden sm:block absolute -left-8 -bottom-12 card px-4 py-3 shadow-lift w-56">
        <p className="text-[11px] text-ink-3 flex items-center gap-1.5"><Radio className="w-3.5 h-3.5 text-danger" /> Live results · 42 of 58 stations</p>
        <p className="text-sm font-semibold text-ink mt-1">You lead by 2,314 votes</p>
      </div>
      <div className="hidden sm:block absolute -right-6 -top-6 card px-4 py-3 shadow-lift">
        <p className="text-[11px] text-ink-3">New from field team</p>
        <p className="text-sm font-semibold text-ink">+126 voters today</p>
      </div>
      <p className="relative mt-4 sm:mt-16 text-right sm:pr-2 text-[11px] text-ink-3">Illustrative dashboard</p>
    </div>
  );
}

export default function Home() {
  const { user } = useAuth();
  const { campaigns } = useCampaigns({ pollInterval: 0 });
  const spotlight = campaigns.filter((c) => isBoostActive(c) || c.featured).slice(0, 3);
  const showcase = (spotlight.length ? spotlight : campaigns).slice(0, 3);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid [mask-image:linear-gradient(to_bottom,black,transparent_75%)] opacity-60" aria-hidden />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-16 sm:pb-24 grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-ink">
              <Sparkles className="w-3.5 h-3.5" /> The campaign HQ for Ghanaian candidates
            </span>
            <h1 className="mt-6 text-[40px] leading-[1.05] sm:text-6xl font-extrabold text-ink text-balance">
              Win your seat with data, <span className="text-accent-ink">not guesswork.</span>
            </h1>
            <p className="mt-6 text-lg text-ink-2 leading-relaxed max-w-xl">
              Know every voter, organise your field team, prove which ads work and see polling-station results first — all from your phone. One tool, <strong className="text-ink">₵120 a month</strong>.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to={user ? '/dashboard' : '/signup'} className="btn btn-lg btn-primary">
                Start 7-day free trial <ArrowRight className="w-[18px] h-[18px]" />
              </Link>
              <a href="#features" className="btn btn-lg btn-secondary">See what&apos;s inside</a>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-3">
              <span className="inline-flex items-center gap-1.5"><CircleCheck className="w-4 h-4 text-success" /> No payment for 7 days</span>
              <span className="inline-flex items-center gap-1.5"><Smartphone className="w-4 h-4 text-success" /> Pay with MoMo or card</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-success" /> Every party welcome</span>
            </div>
          </div>
          <HeroMockup />
        </div>
      </section>

      {/* Offices strip */}
      <section className="border-y border-line bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
          <p className="text-sm font-medium text-ink-3 shrink-0">Built for every race</p>
          <div className="flex flex-wrap gap-2">
            {['Assembly member', 'Unit committee', 'MMDCE', 'Parliamentary primary', 'Member of Parliament', 'Party executive', 'Presidential'].map((o) => (
              <span key={o} className="badge badge-neutral h-8 px-3 text-[13px]">{o}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="eyebrow">Everything a winning campaign runs on</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-ink text-balance">Replace the notebooks, WhatsApp chaos and guesswork with one campaign machine.</h2>
          <p className="mt-4 text-lg text-ink-2">Twelve tools that work together — so every conversation, cedi and vote is counted.</p>
        </div>
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6 card-hover">
              <span className="inline-flex w-11 h-11 items-center justify-center rounded-xl bg-primary text-primary-fg">
                <f.icon className="w-5 h-5" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-ink">{f.title}</h3>
              <p className="mt-2 text-[15px] text-ink-2 leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-primary text-primary-fg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-300 dark:text-navy-800">How it works</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-balance max-w-2xl !text-primary-fg">From first supporter to final pink sheet.</h2>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-white/15 dark:border-navy-950/15 p-6">
                <p className="text-3xl font-extrabold font-display text-gold-300 dark:text-navy-800">{s.n}</p>
                <h3 className="mt-4 text-lg font-bold !text-primary-fg">{s.title}</h3>
                <p className="mt-2 text-[15px] opacity-80 leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Election day */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="eyebrow">Election day</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-ink text-balance">Know the result before the declaration.</h2>
          <p className="mt-4 text-lg text-ink-2 leading-relaxed">
            Give every polling agent a private results link. The moment counting ends they type in the figures from the pink sheet — and your dashboard adds up the constituency in real time, flags stations that haven&apos;t reported and exports a full sheet for your lawyers.
          </p>
          <ul className="mt-6 space-y-3">
            {['Works on any phone with data — no app to install', 'Corrections allowed; the latest submission wins', 'Turnout, rejected ballots and vote share per station'].map((t) => (
              <li key={t} className="flex gap-3 text-ink-2"><CircleCheck className="w-5 h-5 text-success shrink-0" /> {t}</li>
            ))}
          </ul>
        </div>
        <div className="card p-6 shadow-lift" aria-hidden>
          <div className="flex items-center justify-between">
            <p className="font-semibold text-ink">Provisional tally</p>
            <span className="badge badge-danger"><Radio className="w-3.5 h-3.5" /> Live</span>
          </div>
          <p className="text-xs text-ink-3 mt-1">Illustration · 42 of 58 stations reported</p>
          <div className="mt-6 space-y-4">
            {[
              ['Your candidate', 14820, true],
              ['Candidate B', 12506, false],
              ['Candidate C', 1102, false],
            ].map(([n, v, ours]) => (
              <div key={n}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className={ours ? 'font-semibold text-ink' : 'text-ink-2'}>{n}</span>
                  <span className="num font-semibold text-ink">{v.toLocaleString()}</span>
                </div>
                <div className="h-3 rounded-r-[4px]" style={{ width: `${(v / 14820) * 100}%`, background: ours ? 'rgb(var(--viz-1))' : 'rgb(var(--viz-muted))' }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 bg-surface border-y border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="eyebrow">Simple pricing</p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold text-ink">Less than the cost of one banner a month.</h2>
            <p className="mt-4 text-lg text-ink-2">One plan, every tool. Pay monthly or save with a yearly plan.</p>
          </div>
          <PlanCards compact />
          <p className="text-center mt-8">
            <Link to="/pricing" className="text-link font-medium">Compare everything included →</Link>
          </p>
        </div>
      </section>

      {/* Live campaigns */}
      {showcase.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <p className="eyebrow">{spotlight.length ? 'In the spotlight' : 'On CampaignHub now'}</p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-ink">Campaign pages</h2>
            </div>
            <Link to="/campaigns" className="btn btn-secondary btn-sm">Browse all</Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {showcase.map((c) => <CampaignCard key={c.id} campaign={c} />)}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-ink text-center mb-10">Questions candidates ask</h2>
        <div className="border-t border-line">
          {FAQ.map(([q, a]) => <Disclosure key={q} title={q}>{a}</Disclosure>)}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="rounded-3xl bg-primary text-primary-fg p-8 sm:p-14 relative overflow-hidden">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-gold-400/25 blur-3xl" aria-hidden />
          <div className="relative max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-extrabold !text-primary-fg text-balance">The other side is already organising. Start today.</h2>
            <p className="mt-4 text-lg opacity-85">Set up your campaign in two minutes. Full access free for 7 days.</p>
            <Link to={user ? '/dashboard' : '/signup'} className="btn btn-lg btn-gold mt-8">
              Start free trial <ArrowRight className="w-[18px] h-[18px]" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
