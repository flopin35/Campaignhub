import { useId } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '../utils/format';

/** CampaignHub mark — gold "C" with a ballot tick on deep navy. Pure SVG (crisp, ~0 KB). */
export default function BrandMark({ size = 32, className = '', title = 'CampaignHub' }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={cn('shrink-0', className)}
    >
      <defs>
        <linearGradient id={`g${id}`} x1="12" y1="10" x2="52" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F2CF6B" />
          <stop offset="1" stopColor="#C9971F" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="#0F2747" />
      <path d="M43.3 19.2A17 17 0 1 0 43.3 44.8" fill="none" stroke={`url(#g${id})`} strokeWidth="7" strokeLinecap="round" />
      <path d="M25.5 32.5 31 38l10-11" fill="none" stroke="#FFFFFF" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ to = '/', size = 32, className, suffix, inverted = false }) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2.5 shrink-0', className)} aria-label="CampaignHub home">
      <BrandMark size={size} />
      <span className={cn('font-display font-extrabold text-[17px] tracking-tight', inverted ? 'text-white' : 'text-ink')}>
        Campaign<span className={inverted ? 'text-gold-300' : 'text-accent-ink'}>Hub</span>
        {suffix && <span className="ml-1.5 align-middle badge badge-gold h-5 px-1.5 text-[10px] uppercase tracking-wider">{suffix}</span>}
      </span>
    </Link>
  );
}
