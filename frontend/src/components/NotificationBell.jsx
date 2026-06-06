import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subscribeToNotifications, markNotificationRead } from '../services/notificationService';
import { Bell, NotificationIcon } from './icons/AppIcons';

export default function NotificationBell() {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !user?.uid) return;
    return subscribeToNotifications(user.uid, setNotifications);
  }, [isAuthenticated, user?.uid]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!isAuthenticated) return null;

  const unread = notifications.filter((n) => !n.read).length;

  const handleRead = async (n) => {
    if (!n.read) await markNotificationRead(n.id);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-surface-elevated transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand-600 text-[10px] text-white flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto glass-card shadow-xl z-50 p-0">
          <div className="p-3 border-b border-surface-border flex items-center justify-between">
            <span className="text-sm font-medium text-white">Notifications</span>
            <Link to="/notifications" onClick={() => setOpen(false)} className="text-xs text-brand-400">View all</Link>
          </div>
          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-gray-500 text-center">No notifications yet</p>
          ) : (
            notifications.slice(0, 8).map((n) => (
              <button
                key={n.id}
                onClick={() => handleRead(n)}
                className={`w-full text-left p-3 border-b border-surface-border/50 hover:bg-surface-elevated/50 transition-colors ${
                  !n.read ? 'bg-brand-600/5' : ''
                }`}
              >
                <div className="flex gap-2">
                  <NotificationIcon type={n.type} className="w-4 h-4 shrink-0 mt-0.5 text-brand-400" />
                  <p className="text-xs text-gray-300 line-clamp-2">{n.message}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
