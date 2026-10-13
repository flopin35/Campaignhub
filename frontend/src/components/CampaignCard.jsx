import { Link } from 'react-router-dom';
import { BadgeCheck, MapPin, Zap } from 'lucide-react';
import { isBoostActive } from '../utils/campaignHelpers';
import { initials } from '../utils/format';

export default function CampaignCard({ campaign: c }) {
  const color = c.themeColor || '#0f2747';
  const boosted = isBoostActive(c);
  return (
    <Link to={`/campaign/${c.slug}`} className="card card-hover overflow-hidden flex flex-col group">
      <div className="relative aspect-[16/7] overflow-hidden" style={{ background: color }}>
        {c.bannerImage ? (
          <img src={c.bannerImage} alt="" className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="absolute inset-0 bg-grid opacity-20" />
        )}
        {boosted && (
          <span className="absolute top-3 left-3 badge badge-gold shadow-xs"><Zap className="w-3.5 h-3.5" /> Spotlight</span>
        )}
      </div>
      <div className="p-5 pt-0 flex-1 flex flex-col">
        <div className="-mt-7 mb-3 w-14 h-14 rounded-xl border-4 border-surface overflow-hidden bg-surface-3 shadow-xs relative">
          {c.logoUrl ? (
            <img src={c.logoUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <span className="w-full h-full flex items-center justify-center text-white font-bold" style={{ background: color }}>
              {initials(c.candidateName || c.title)}
            </span>
          )}
        </div>
        <h3 className="font-bold text-ink leading-snug flex items-start gap-1.5">
          <span className="line-clamp-2">{c.title}</span>
          {c.verified && <BadgeCheck className="w-4 h-4 text-link shrink-0 mt-0.5" aria-label="Verified" />}
        </h3>
        <p className="text-sm text-ink-3 mt-1">{[c.campaignType, c.party].filter(Boolean).join(' · ')}</p>
        {(c.constituency || c.region) && (
          <p className="text-xs text-ink-3 mt-2 inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" /> {[c.constituency, c.region].filter(Boolean).join(', ')}
          </p>
        )}
        {c.slogan && <p className="text-sm text-ink-2 mt-3 italic line-clamp-2">“{c.slogan}”</p>}
      </div>
    </Link>
  );
}
