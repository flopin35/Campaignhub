import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { Plus, Megaphone, Eye, ArrowRight, Users, Vote, Footprints, Sparkles } from 'lucide-react';
import { useMyCampaigns } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import { Button, Badge, PageHeader, PageLoader, Card } from '../components/ui';
import { getBillingState, describeBilling, canStartTrial } from '../utils/billing';
import { isCampaignVisible } from '../utils/campaignHelpers';
import { sectionPath } from '../data/workspaceNav';
import { compactNumber } from '../utils/format';

export default function Dashboard() {
  const { campaigns, loading, error } = useMyCampaigns();
  const { userProfile, user } = useAuth();
  const [params] = useSearchParams();
  const firstName = (userProfile?.name || user?.displayName || '').split(' ')[0];

  if (loading) return <PageLoader label="Loading your campaigns…" />;
  const legacySlug = params.get('campaign');
  const legacy = legacySlug && campaigns.find((c) => c.slug === legacySlug);
  if (legacy) return <Navigate to={sectionPath(legacy.id)} replace />;
  if (campaigns.length === 1 && !params.get('list')) {
    return <Navigate to={sectionPath(campaigns[0].id)} replace />;
  }

  if (!campaigns.length) {
    const trial = canStartTrial(userProfile);
    return (
      <div className="max-w-3xl mx-auto py-6 animate-fade-up">
        <p className="eyebrow">Welcome{firstName ? `, ${firstName}` : ''}</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink mt-3 leading-tight">Let&apos;s set up your campaign headquarters.</h1>
        <p className="text-lg text-ink-2 mt-3 leading-relaxed">
          Create your campaign page in about two minutes. {trial ? 'You get every Pro tool free for 7 days — no payment needed to start.' : 'Choose a plan to publish it and unlock every tool.'}
        </p>
        <div className="mt-8 grid sm:grid-cols-2 gap-3">
          {[
            { icon: Users, t: 'Voter CRM', d: 'Every supporter by polling station' },
            { icon: Footprints, t: 'Field team links', d: 'Door-to-door logging from any phone' },
            { icon: Vote, t: 'Election-day results', d: 'Live collation from your agents' },
            { icon: Sparkles, t: 'AI speechwriter', d: 'Speeches & ads in local languages' },
          ].map((f) => (
            <div key={f.t} className="card p-4 flex gap-3">
              <span className="w-9 h-9 rounded-lg bg-accent-soft text-accent-ink flex items-center justify-center shrink-0"><f.icon className="w-[18px] h-[18px]" /></span>
              <span>
                <span className="block text-sm font-semibold text-ink">{f.t}</span>
                <span className="block text-xs text-ink-3">{f.d}</span>
              </span>
            </div>
          ))}
        </div>
        <Button to="/dashboard/new" size="lg" className="mt-8" iconRight={ArrowRight}>
          {trial ? 'Create campaign & start free trial' : 'Create campaign page'}
        </Button>
        {error && <p className="text-sm text-danger mt-4">{error}</p>}
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Your campaigns"
        title={`Welcome back${firstName ? `, ${firstName}` : ''}`}
        subtitle="Each campaign page has its own Pro plan, voters, field team and results."
        actions={<Button to="/dashboard/new" icon={Plus}>New campaign page</Button>}
      />
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {campaigns.map((c) => {
          const b = getBillingState(c);
          return (
            <Link key={c.id} to={sectionPath(c.id)} className="card card-hover overflow-hidden flex flex-col group">
              <div className="h-28 bg-surface-3 relative" style={{ background: c.bannerImage ? undefined : c.themeColor || '#0f2747' }}>
                {c.bannerImage && <img src={c.bannerImage} alt="" className="w-full h-full object-cover" loading="lazy" />}
                <div className="absolute top-3 left-3 flex gap-1.5">
                  <Badge tone={b.tone} className="shadow-xs">{b.label}</Badge>
                  {isCampaignVisible(c) && <Badge tone="success" className="shadow-xs">Live</Badge>}
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-base font-bold text-ink group-hover:text-link">{c.title}</h3>
                <p className="text-sm text-ink-3 mt-0.5">{[c.campaignType, c.constituency || c.region].filter(Boolean).join(' · ') || 'Campaign page'}</p>
                <p className="text-xs text-ink-3 mt-3">{describeBilling(b)}</p>
                <div className="mt-auto pt-4 flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1.5 text-ink-3"><Eye className="w-4 h-4" /> {compactNumber(c.views)} views</span>
                  <span className="inline-flex items-center gap-1 font-medium text-ink">Open <ArrowRight className="w-4 h-4" /></span>
                </div>
              </div>
            </Link>
          );
        })}
        <Link to="/dashboard/new" className="rounded-2xl border-2 border-dashed border-line-strong flex flex-col items-center justify-center p-8 text-center hover:bg-surface-2 transition-colors min-h-[240px]">
          <span className="w-11 h-11 rounded-full bg-surface-3 flex items-center justify-center"><Megaphone className="w-5 h-5 text-ink-2" /></span>
          <span className="mt-3 font-semibold text-ink">Add another campaign page</span>
          <span className="text-sm text-ink-3 mt-1">For a running mate, primary or another race</span>
        </Link>
      </div>
      <Card className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-ink-2">Need help setting up? Our team can import your voter lists and polling stations for you.</p>
        <Button variant="secondary" to="/support">Contact support</Button>
      </Card>
    </div>
  );
}
