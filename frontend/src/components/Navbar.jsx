import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import VerifyEmailNotice from './VerifyEmailNotice';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/campaigns', label: 'Campaigns' },
  { to: '/premium', label: 'Premium' },
  { to: '/dashboard', label: 'Dashboard' },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isVerified, isAdmin, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    setMenuOpen(false);
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-40 backdrop-blur-xl bg-surface/85 border-b border-surface-border/80"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 flex items-center justify-center text-white font-bold text-sm shadow-glow-sm group-hover:shadow-glow transition-shadow">
              CH
            </div>
            <span className="font-bold text-lg text-white hidden xs:inline">CampaignHub</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  location.pathname === link.to
                    ? 'text-brand-400 bg-brand-600/10'
                    : 'text-gray-400 hover:text-white hover:bg-surface-elevated'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/admin"
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  location.pathname === '/admin'
                    ? 'text-brand-400 bg-brand-600/10'
                    : 'text-gray-400 hover:text-white hover:bg-surface-elevated'
                }`}
              >
                Admin
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated && !isVerified && (
              <div className="hidden lg:block">
                <VerifyEmailNotice compact />
              </div>
            )}

            {isAuthenticated ? (
              <>
                <NotificationBell />
                {isVerified && (
                  <Link to="/upload" className="btn-primary text-sm py-2 px-4 hidden sm:inline-flex">
                    Launch
                  </Link>
                )}
                <button onClick={handleLogout} className="btn-secondary text-sm py-2 px-3 hidden sm:inline-flex">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary text-sm py-2 px-3 hidden sm:inline-flex">
                  Sign In
                </Link>
                <Link to="/signup" className="btn-primary text-sm py-2 px-4">
                  Get Started
                </Link>
              </>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-surface-elevated"
              aria-label="Menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="md:hidden border-t border-surface-border py-4 space-y-1"
          >
            {[...navLinks, ...(isAdmin ? [{ to: '/admin', label: 'Admin' }] : [])].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 rounded-xl text-sm font-medium text-gray-300 hover:bg-surface-elevated"
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated && (
              <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-gray-400">
                Logout
              </button>
            )}
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
}
