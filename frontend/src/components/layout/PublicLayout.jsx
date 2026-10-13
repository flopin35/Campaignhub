import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu as MenuIcon, X, ArrowRight } from 'lucide-react';
import { Logo } from '../BrandMark';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/format';

const LINKS = [
  { to: '/#features', label: 'Features' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/campaigns', label: 'Campaigns' },
  { to: '/about', label: 'About' },
];

export function PublicNav() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname, location.hash]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 transition-colors',
        scrolled || open ? 'bg-surface/90 backdrop-blur-md border-b border-line' : 'bg-transparent border-b border-transparent',
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-6">
        <Logo />
        <nav className="hidden md:flex items-center gap-1 ml-4" aria-label="Main">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  'px-3 h-9 inline-flex items-center rounded-lg text-sm font-medium transition-colors',
                  isActive && !l.to.includes('#') ? 'text-ink bg-surface-2' : 'text-ink-2 hover:text-ink',
                )
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          {user ? (
            <Link to="/dashboard" className="btn btn-primary btn-sm h-9 px-4">
              Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link to="/login" className="hidden sm:inline-flex btn btn-ghost btn-sm h-9">
                Sign in
              </Link>
              <Link to="/signup" className="btn btn-primary btn-sm h-9 px-4">
                Start free trial
              </Link>
            </>
          )}
          <button
            type="button"
            className="md:hidden btn btn-ghost btn-icon h-9 w-9"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-line bg-surface px-4 pb-5 pt-2 animate-fade-up">
          <nav className="flex flex-col" aria-label="Mobile">
            {LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="h-12 flex items-center text-[15px] font-medium text-ink border-b border-line">
                {l.label}
              </Link>
            ))}
            {!user && (
              <Link to="/login" className="h-12 flex items-center text-[15px] font-medium text-ink border-b border-line">
                Sign in
              </Link>
            )}
          </nav>
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-ink-3">Appearance</span>
            <ThemeToggle />
          </div>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line bg-surface mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="text-sm text-ink-3 mt-4 max-w-xs leading-relaxed">
            The campaign operating system for Ghanaian candidates — from the first supporter to the final pink sheet.
          </p>
          <p className="text-xs text-ink-3 mt-4">
            Payments secured by Paystack &amp; Flutterwave · MoMo &amp; cards
          </p>
        </div>
        <FooterCol
          title="Product"
          links={[
            ['/#features', 'Features'],
            ['/pricing', 'Pricing'],
            ['/campaigns', 'Campaign directory'],
            ['/signup', 'Start free trial'],
          ]}
        />
        <FooterCol
          title="Company"
          links={[
            ['/about', 'About'],
            ['/support', 'Support'],
            ['mailto:campaignhubgh@gmail.com', 'campaignhubgh@gmail.com'],
          ]}
        />
        <FooterCol
          title="Legal"
          links={[
            ['/terms', 'Terms of service'],
            ['/privacy', 'Privacy policy'],
            ['/refunds', 'Refund policy'],
          ]}
        />
      </div>
      <div className="border-t border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 text-xs text-ink-3 flex flex-col sm:flex-row gap-2 justify-between">
          <span>© {year} CampaignHub Ghana. All rights reserved.</span>
          <span>Non-partisan · Built in Ghana for every party and independent candidate</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <p className="text-sm font-semibold text-ink mb-3">{title}</p>
      <ul className="space-y-2.5">
        {links.map(([to, label]) => (
          <li key={to}>
            {to.startsWith('mailto:') ? (
              <a href={to} className="text-sm text-ink-3 hover:text-ink break-all">
                {label}
              </a>
            ) : (
              <Link to={to} className="text-sm text-ink-3 hover:text-ink">
                {label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PublicLayout() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <div className="min-h-screen flex flex-col">
      <PublicNav />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
