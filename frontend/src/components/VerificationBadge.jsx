import { BadgeCheck } from './icons/AppIcons';

export default function VerificationBadge({ verified, label = 'Official Page' }) {
  if (!verified) return null;
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20"
      role="status"
      aria-label="Official Page — admin-authorized official campaign page"
      title="Admin-authorized official campaign page"
    >
      <BadgeCheck className="w-3.5 h-3.5" aria-hidden />
      {label}
    </span>
  );
}

export function VerifiedUserBadge({ verified }) {
  if (!verified) return null;
  return (
    <span
      className="inline-flex items-center text-blue-400"
      role="status"
      aria-label="Email confirmed"
      title="Email confirmed"
    >
      <BadgeCheck className="w-4 h-4" aria-hidden />
    </span>
  );
}
