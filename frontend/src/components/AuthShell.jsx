import { CircleCheck } from 'lucide-react';
import { Logo } from './BrandMark';
import ThemeToggle from './layout/ThemeToggle';

const POINTS = [
  'Voter CRM with path-to-victory projection',
  'Canvassing & polling-agent links — no app needed',
  'Live election-day results collation',
  'AI speechwriter in English, Twi, Ga, Ewe & more',
];

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_1.1fr]">
      <aside className="hidden lg:flex flex-col justify-between bg-navy-900 text-white p-12 relative overflow-hidden">
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-gold-400/10 blur-3xl" aria-hidden />
        <div className="absolute -left-20 bottom-0 w-80 h-80 rounded-full bg-navy-400/20 blur-3xl" aria-hidden />
        <div className="relative">
          <Logo inverted />
        </div>
        <div className="relative max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-300">CampaignHub Pro</p>
          <h2 className="mt-4 text-4xl font-extrabold leading-tight !text-white text-balance">Run your campaign like the professionals.</h2>
          <ul className="mt-8 space-y-3.5">
            {POINTS.map((p) => (
              <li key={p} className="flex gap-3 text-white/85">
                <CircleCheck className="w-5 h-5 text-gold-300 shrink-0" /> {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/60">7-day free trial · then ₵120/month or ₵1,200/year</p>
      </aside>

      <main className="flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-6">
          <div className="lg:hidden"><Logo /></div>
          <ThemeToggle className="ml-auto" />
        </div>
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 pb-12">
          <div className="w-full max-w-[420px] animate-fade-up">
            <h1 className="text-[28px] font-extrabold text-ink leading-tight">{title}</h1>
            {subtitle && <p className="text-ink-2 mt-2">{subtitle}</p>}
            <div className="mt-8 space-y-5">{children}</div>
            {footer && <div className="mt-8 text-center">{footer}</div>}
          </div>
        </div>
      </main>
    </div>
  );
}
