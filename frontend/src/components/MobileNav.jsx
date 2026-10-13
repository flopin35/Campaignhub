import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, PlusCircle, LayoutDashboard, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useMyCampaignsPremium } from '../hooks/useMyCampaignsPremium';

export default function MobileNav() {
  const location = useLocation();
  const { isAuthenticated, isVerified } = useAuth();
  const { hasAnyPremium } = useMyCampaignsPremium();

  const links = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/campaigns', label: 'Directory', icon: LayoutGrid },
    ...(isAuthenticated && isVerified
      ? [{ to: '/upload', label: 'Launch', icon: PlusCircle, highlight: true }]
      : []),
    { to: '/premium', label: 'Hosting', icon: Shield, premiumActive: hasAnyPremium },
    ...(isAuthenticated
      ? [{ to: '/dashboard', label: 'My Pages', icon: LayoutDashboard }]
      : [{ to: '/login', label: 'Sign In', icon: LayoutDashboard }]),
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-surface-border bg-surface/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary"
    >
      <div className="flex items-stretch justify-around h-16 px-1">
        {links.map((link) => {
          const active = location.pathname === link.to;
          const Icon = link.icon;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 py-1 rounded-lg transition-colors ${
                active
                  ? 'text-brand-400'
                  : link.premiumActive
                    ? 'text-emerald-400'
                    : link.highlight
                      ? 'text-brand-400'
                      : 'text-gray-400 hover:text-gray-200'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className={`w-5 h-5 shrink-0 ${link.highlight && !active ? 'text-brand-500' : ''}`} aria-hidden />
              <span className="text-[10px] font-medium truncate max-w-full px-0.5 whitespace-nowrap">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
