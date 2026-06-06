import { SidebarIcon } from './icons/AppIcons';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'verification', label: 'Verification' },
  { id: 'reports', label: 'Reports' },
  { id: 'comments', label: 'Comments' },
];

export default function Sidebar({ activeTab, onTabChange }) {
  return (
    <aside className="w-64 bg-surface-card border-r border-surface-border min-h-[calc(100vh-4rem)] p-4 hidden lg:block shrink-0">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-4 px-3">Control Center</p>
      <nav className="space-y-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange?.(tab.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-brand-600/10 text-brand-400'
                : 'text-gray-400 hover:text-white hover:bg-surface-elevated'
            }`}
          >
            <SidebarIcon tabId={tab.id} className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="mt-8 p-4 bg-surface-elevated rounded-xl">
        <p className="text-xs text-gray-500 mb-1">Admin Operations</p>
        <p className="text-xs text-gray-400">
          Approve payments, verify campaigns, moderate content, manage extensions.
        </p>
      </div>
    </aside>
  );
}
