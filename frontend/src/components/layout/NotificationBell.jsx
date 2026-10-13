import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeToNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/notificationService';
import { Menu } from '../ui';
import { timeAgo, cn } from '../../utils/format';

export default function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!user?.uid) return undefined;
    return subscribeToNotifications(user.uid, setItems, () => setItems([]));
  }, [user?.uid]);

  const unread = items.filter((n) => !n.read).length;

  return (
    <Menu
      trigger={({ toggle }) => (
        <button
          type="button"
          onClick={toggle}
          className="btn btn-ghost btn-icon h-9 w-9 relative"
          aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
        >
          <Bell className="w-[18px] h-[18px]" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] font-bold leading-4 text-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      )}
    >
      <div className="w-[min(88vw,360px)]">
        <div onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-2.5 py-2">
          <p className="text-sm font-semibold text-ink">Notifications</p>
          {unread > 0 && (
            <button
              type="button"
              className="text-xs text-link inline-flex items-center gap-1"
              onClick={() => markAllNotificationsRead(user.uid).catch(() => {})}
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-sm text-ink-3 px-3 py-8 text-center">You&apos;re all caught up.</p>
          ) : (
            items.slice(0, 12).map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => !n.read && markNotificationRead(n.id).catch(() => {})}
                className={cn(
                  'w-full text-left flex gap-3 px-2.5 py-2.5 rounded-lg hover:bg-surface-2',
                  !n.read && 'bg-info-soft/60',
                )}
              >
                <span className={cn('mt-1.5 w-2 h-2 rounded-full shrink-0', n.read ? 'bg-transparent' : 'bg-link')} />
                <span className="min-w-0">
                  <span className="block text-sm text-ink leading-snug">{n.message}</span>
                  <span className="block text-xs text-ink-3 mt-0.5">{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            ))
          )}
        </div>
        </div>
        <Link to="/notifications" className="block text-center text-sm text-link font-medium py-2.5 border-t border-line mt-1">
          View all
        </Link>
      </div>
    </Menu>
  );
}
