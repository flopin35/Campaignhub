import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

/** Gentle upgrade prompt — never aggressive blocking */
export default function UpgradePrompt({
  title,
  description,
  cta = 'View verification & hosting',
  to = '/premium',
  onClick = null,
}) {
  const actionClass = 'text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors';

  return (
    <div className="rounded-xl border border-surface-border bg-surface-elevated/50 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-brand-600/10 flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white mb-1">{title}</p>
          <p className="text-xs text-gray-500 leading-relaxed mb-3">{description}</p>
          {onClick ? (
            <button type="button" onClick={onClick} className={actionClass}>
              {cta} →
            </button>
          ) : (
            <Link to={to} className={actionClass}>
              {cta} →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
