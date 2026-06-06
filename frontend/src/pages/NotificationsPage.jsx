import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { subscribeToNotifications, markNotificationRead, markAllNotificationsRead } from '../services/notificationService';
import { NotificationIcon } from '../components/icons/AppIcons';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeToNotifications(user.uid, setNotifications);
  }, [user?.uid]);

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Notifications</h1>
            <p className="text-sm text-gray-500">{unread} unread</p>
          </div>
          {unread > 0 && (
            <button onClick={() => markAllNotificationsRead(user.uid)} className="btn-secondary text-sm">
              Mark all read
            </button>
          )}
        </div>

        <div className="space-y-2">
          {notifications.length === 0 ? (
            <p className="text-center text-gray-500 py-16">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`glass-card p-4 flex gap-3 ${!n.read ? 'border-brand-500/20' : ''}`}
                onClick={() => !n.read && markNotificationRead(n.id)}
              >
                <NotificationIcon type={n.type} className="w-5 h-5 shrink-0 text-brand-400" />
                <div className="flex-1">
                  <p className="text-sm text-gray-300">{n.message}</p>
                  {n.campaignId && (
                    <Link to={`/campaigns`} className="text-xs text-brand-400 mt-1 inline-block">
                      View campaign →
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
