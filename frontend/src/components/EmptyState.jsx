import { Link } from 'react-router-dom';
import { Inbox } from './icons/AppIcons';

export default function EmptyState({ title, description, actionLabel, actionTo, secondaryLabel, secondaryTo }) {
  return (
    <div className="text-center py-20 px-4" role="status">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-elevated flex items-center justify-center">
        <Inbox className="w-8 h-8 text-gray-400" aria-hidden />
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm max-w-md mx-auto mb-6 leading-relaxed">{description}</p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        {actionLabel && actionTo && (
          <Link to={actionTo} className="btn-primary text-sm">
            {actionLabel}
          </Link>
        )}
        {secondaryLabel && secondaryTo && (
          <Link to={secondaryTo} className="btn-secondary text-sm">
            {secondaryLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
