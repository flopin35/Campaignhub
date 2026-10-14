import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ChevronsUpDown,
  Plus,
  Menu as MenuIcon,
  X,
  LogOut,
  Settings,
  Bell,
  Shield,
  ExternalLink,
  Lock,
  Crown,
  House,
  LayoutGrid,
} from 'lucide-react';
import { Logo } from '../BrandMark';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';
import { Avatar, Badge, Menu, MenuItem } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { MyCampaignsProvider, useMyCampaigns } from '../../context/WorkspaceContext';
import { WORKSPACE_SECTIONS, sectionPath } from '../../data/workspaceNav';
import { getBillingState } from '../../utils/billing';
import { cn } from '../../utils/format';

function CampaignSwitcher({ currentId, onNavigate }) {
  const { campaigns, loading } = useMyCampaigns();
  const navigate = useNavigate();
  const current = campaigns.find((c) => c.id === currentId);

  return (
    <Menu
      align="left"
      className="w-full"
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={toggle}
          className={cn(
            'w-full flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-left hover:bg-surface-2 transition-colors',
            open && 'ring-2 ring-link/20',
          )}
          aria-haspopup="menu"
        >
          {current?.logoUrl ? (
            <img src={current.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover bg-surface-3" />
          ) : (
            <Avatar name={current?.candidateName || current?.title || 'Campaign'} size={32} className="rounded-lg" />
          )}
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink truncate">
              {current ? current.title : loading ? 'Loading…' : 'Select a campaign'}
            </span>
            <span className="block text-xs text-ink-3 truncate">
              {current ? getBillingState(current).label : `${campaigns.length} campaign page${campaigns.length === 1 ? '' : 's'}`}
            </span>
          </span>
          <ChevronsUpDown className="w-4 h-4 text-ink-3 shrink-0" />
        </button>
      )}
    >
      <div className="w-[260px] max-h-[60vh] overflow-y-auto">
        <p className="px-3 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Your campaign pages</p>
        {campaigns.map((c) => {
          const b = getBillingState(c);
          return (
            <MenuItem
              key={c.id}
              onClick={() => {
                navigate(sectionPath(c.id));
                onNavigate?.();
              }}
            >
              <span className="flex-1 min-w-0 truncate">{c.title}</span>
              <Badge tone={b.tone} className="h-5 text-[10px]">{b.label}</Badge>
            </MenuItem>
          );
        })}
        {!campaigns.length && !loading && <p className="px-3 py-2 text-sm text-ink-3">No campaign pages yet.</p>}
        <div className="divider my-1.5" />
        <MenuItem
          icon={LayoutGrid}
          onClick={() => {
            navigate('/dashboard?list=1');
            onNavigate?.();
          }}
        >
          All campaign pages
        </MenuItem>
        <MenuItem
          icon={Plus}
          onClick={() => {
            navigate('/dashboard/new');
            onNavigate?.();
          }}
        >
          New campaign page
        </MenuItem>
      </div>
    </Menu>
  );
}

function SidebarContent({ campaignId, onNavigate }) {
  const { isAdmin } = useAuth();
  const { campaigns } = useMyCampaigns();
  const campaign = campaigns.find((c) => c.id === campaignId);
  const billing = getBillingState(campaign);
  let lastGroup = null;

  return (
    <div className="flex flex-col h-full">
      <div className="h-16 flex items-center px-4 shrink-0">
        <Logo to="/dashboard" size={30} />
      </div>
      <div className="px-3 pb-3">
        <CampaignSwitcher currentId={campaignId} onNavigate={onNavigate} />
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Workspace">
        {campaignId ? (
          WORKSPACE_SECTIONS.map((s) => {
            const header = s.group !== lastGroup ? s.group : null;
            lastGroup = s.group;
            const locked = s.pro && campaign && !billing.isPro;
            return (
              <div key={s.id}>
                {header && <p className="px-3 pt-4 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-3">{header}</p>}
                <NavLink
                  to={sectionPath(campaignId, s.id)}
                  end={s.id === 'overview'}
                  onClick={onNavigate}
                  className={({ isActive }) => cn('nav-item', isActive && 'nav-item-active')}
                >
                  <s.icon className="w-[18px] h-[18px] shrink-0" aria-hidden />
                  <span className="flex-1 truncate">{s.label}</span>
                  {locked && <Lock className="w-3.5 h-3.5 text-ink-3" aria-label="Pro" />}
                </NavLink>
              </div>
            );
          })
        ) : (
          <div className="space-y-1 pt-2">
            <NavLink to="/dashboard" end onClick={onNavigate} className={({ isActive }) => cn('nav-item', isActive && 'nav-item-active')}>
              <House className="w-[18px] h-[18px]" /> All campaign pages
            </NavLink>
            <NavLink to="/dashboard/new" onClick={onNavigate} className={({ isActive }) => cn('nav-item', isActive && 'nav-item-active')}>
              <Plus className="w-[18px] h-[18px]" /> New campaign page
            </NavLink>
          </div>
        )}

        <p className="px-3 pt-5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Account</p>
        <NavLink to="/notifications" onClick={onNavigate} className={({ isActive }) => cn('nav-item', isActive && 'nav-item-active')}>
          <Bell className="w-[18px] h-[18px]" /> Notifications
        </NavLink>
        <NavLink to="/settings" onClick={onNavigate} className={({ isActive }) => cn('nav-item', isActive && 'nav-item-active')}>
          <Settings className="w-[18px] h-[18px]" /> Settings
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin" onClick={onNavigate} className={({ isActive }) => cn('nav-item', isActive && 'nav-item-active')}>
            <Shield className="w-[18px] h-[18px]" /> Admin
          </NavLink>
        )}
      </nav>

      {campaign && !billing.isPro && (
        <div className="m-3 rounded-xl border border-accent/30 bg-accent-soft p-3.5">
          <p className="text-sm font-semibold text-ink flex items-center gap-1.5">
            <Crown className="w-4 h-4 text-accent-ink" /> Unlock CampaignHub Pro
          </p>
          <p className="text-xs text-ink-2 mt-1">₵120/month or ₵1,200/year. Every tool, one price.</p>
          <Link to={sectionPath(campaignId, 'billing')} onClick={onNavigate} className="btn btn-gold btn-sm w-full mt-3">
            See plans
          </Link>
        </div>
      )}
      {campaign && billing.state === 'trialing' && (
        <div className="m-3 rounded-xl border border-line bg-surface-2 p-3.5">
          <p className="text-xs text-ink-2">
            <span className="font-semibold text-ink">{billing.daysLeft} day{billing.daysLeft === 1 ? '' : 's'}</span> left in your free trial.
          </p>
          <Link to={sectionPath(campaignId, 'billing')} onClick={onNavigate} className="btn btn-primary btn-sm w-full mt-2.5">
            Choose a plan
          </Link>
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, userProfile, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const name = userProfile?.name || user?.displayName || user?.email || 'Account';
  return (
    <Menu
      trigger={({ toggle }) => (
        <button type="button" onClick={toggle} className="flex items-center gap-2 rounded-full pl-1 pr-1 sm:pr-3 h-9 hover:bg-surface-2" aria-label="Account menu">
          <Avatar name={name} src={user?.photoURL} size={30} />
          <span className="hidden sm:block text-sm font-medium text-ink max-w-[140px] truncate">{name}</span>
        </button>
      )}
    >
      <div className="px-3 py-2">
        <p className="text-sm font-semibold text-ink truncate">{name}</p>
        <p className="text-xs text-ink-3 truncate">{user?.email}</p>
      </div>
      <div className="divider my-1" />
      <MenuItem icon={Settings} onClick={() => navigate('/settings')}>Settings</MenuItem>
      <MenuItem icon={Bell} onClick={() => navigate('/notifications')}>Notifications</MenuItem>
      {isAdmin && <MenuItem icon={Shield} onClick={() => navigate('/admin')}>Admin console</MenuItem>}
      <MenuItem icon={ExternalLink} onClick={() => navigate('/')}>Public website</MenuItem>
      <div className="divider my-1" />
      <MenuItem
        icon={LogOut}
        danger
        onClick={async () => {
          await logout();
          navigate('/');
        }}
      >
        Sign out
      </MenuItem>
    </Menu>
  );
}

function AppShell() {
  const { campaignId } = useParams();
  const [drawer, setDrawer] = useState(false);
  const location = useLocation();

  useEffect(() => setDrawer(false), [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = drawer ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawer]);

  return (
    <div className="min-h-screen lg:pl-[272px]">
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-[272px] border-r border-line bg-surface z-30">
        <SidebarContent campaignId={campaignId} />
      </aside>

      {drawer && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-navy-950/50" onClick={() => setDrawer(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-[86%] max-w-[300px] bg-surface border-r border-line shadow-pop animate-fade-up">
            <button
              type="button"
              className="absolute top-3.5 right-3 btn btn-ghost btn-icon h-9 w-9"
              onClick={() => setDrawer(false)}
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent campaignId={campaignId} onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <header className="sticky top-0 z-20 h-16 bg-canvas/85 backdrop-blur-md border-b border-line">
        <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center gap-3">
          <button type="button" className="lg:hidden btn btn-ghost btn-icon h-9 w-9 -ml-1" onClick={() => setDrawer(true)} aria-label="Open menu">
            <MenuIcon className="w-5 h-5" />
          </button>
          <div className="lg:hidden">
            <Logo to="/dashboard" size={28} />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <NotificationBell />
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-[1240px] mx-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default function AppLayout({ mockCampaigns }) {
  return (
    <MyCampaignsProvider mock={mockCampaigns}>
      <AppShell />
    </MyCampaignsProvider>
  );
}
