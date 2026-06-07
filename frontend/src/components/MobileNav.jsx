import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, PlusCircle, LayoutDashboard, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function MobileNav() {
  const location = useLocation();
  const { isAuthenticated, isVerified } = useAuth();

  const links = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/campaigns', label: 'Explore', icon: LayoutGrid },
    ...(isAuthenticated && isVerified
      ? [{ to: '/upload', label: 'Launch', icon: PlusCircle, highlight: true }]
      : []),
    { to: '/premium', label: 'Premium', icon: Sparkles },
    ...(isAuthenticated
      ? [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }]
      : [{ to: '/login', label: 'Sign In', icon: LayoutDashboard }]),
  ];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-surface-border bg-surface/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 px-1">
        {links.map((link) => {
          const active = location.pathname === link.to;
          const Icon = link.icon;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[3.5rem] py-1 rounded-lg transition-colors ${
                active
                  ? 'text-brand-400'
                  : link.highlight
                    ? 'text-brand-400'
                    : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon className={`w-5 h-5 ${link.highlight && !active ? 'text-brand-500' : ''}`} />
              <span className="text-[10px] font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
