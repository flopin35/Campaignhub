import { BadgeCheck } from './icons/AppIcons';

export default function VerificationBadge({ verified, label = 'Verified Campaign' }) {
  if (!verified) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
      <BadgeCheck className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}

export function VerifiedUserBadge({ verified }) {
  if (!verified) return null;
  return (
    <span className="inline-flex items-center text-blue-400" title="Verified user">
      <BadgeCheck className="w-4 h-4" />
    </span>
  );
}
