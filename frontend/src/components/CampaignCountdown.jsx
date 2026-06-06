import { useEffect, useState } from 'react';
import { formatCountdown } from '../utils/helpers';
import { Timer } from './icons/AppIcons';

export default function CampaignCountdown({ remainingMs: initialMs, endDate }) {
  const [remainingMs, setRemainingMs] = useState(initialMs);

  useEffect(() => {
    if (!endDate) return;
    const end = new Date(endDate).getTime();
    const tick = () => setRemainingMs(Math.max(0, end - Date.now()));
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [endDate]);

  useEffect(() => {
    if (initialMs != null) setRemainingMs(initialMs);
  }, [initialMs]);

  if (remainingMs == null && !endDate) return null;

  const label = remainingMs != null ? formatCountdown(remainingMs) : '';

  if (!label || label === 'Expired') {
    return <span className="text-red-400 text-sm font-medium">Expired</span>;
  }

  const daysMatch = label.match(/(\d+)d/);
  const days = daysMatch ? parseInt(daysMatch[1], 10) : null;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${
      days != null && days <= 3
        ? 'bg-amber-500/10 border-amber-500/30'
        : 'bg-brand-600/10 border-brand-500/20'
    }`}>
      <Timer className="w-4 h-4 text-brand-400" />
      <span className="text-sm text-gray-300">
        {days != null ? `${days} day${days !== 1 ? 's' : ''} remaining` : label}
      </span>
    </div>
  );
}
