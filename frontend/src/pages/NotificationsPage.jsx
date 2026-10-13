import { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { subscribeToNotifications, markAllNotificationsRead, markNotificationRead } from '../services/notificationService';
import { Card, Button, PageHeader, EmptyState } from '../components/ui';
import { formatDateTime, cn } from '../utils/format';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);

  useEffect(() => {
    if (!user?.uid) return undefined;
    return subscribeToNotifications(user.uid, setItems, () => setItems([]));
  }, [user?.uid]);

  const unread = (items || []).filter((n) => !n.read).length;

  return (
    <div className="max-w-3xl animate-fade-up">
      <PageHeader
        title="Notifications"
        subtitle="Payments, supporters, volunteers and account updates."
        actions={unread > 0 && <Button variant="secondary" icon={CheckCheck} onClick={() => markAllNotificationsRead(user.uid)}>Mark all read</Button>}
      />
      <Card pad={false}>
        {items === null ? (
          <p className="p-6 text-sm text-ink-3">Loading…</p>
        ) : items.length === 0 ? (
          <EmptyState icon={Bell} title="Nothing yet" text="We'll let you know when supporters sign up, payments clear and more." />
        ) : (
          <ul className="divide-y divide-line">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => !n.read && markNotificationRead(n.id).catch(() => {})}
                  className={cn('w-full text-left px-5 sm:px-6 py-4 flex gap-3 hover:bg-surface-2', !n.read && 'bg-info-soft/50')}
                >
                  <span className={cn('mt-1.5 w-2 h-2 rounded-full shrink-0', n.read ? 'bg-line-strong' : 'bg-link')} />
                  <span className="min-w-0">
                    <span className="block text-[15px] text-ink">{n.message}</span>
                    <span className="block text-xs text-ink-3 mt-1">{formatDateTime(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
