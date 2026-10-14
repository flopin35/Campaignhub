import { lazy, Suspense, useState } from 'react';
import ErrorBoundary from '../../components/ErrorBoundary';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ExternalLink, TriangleAlert, Clock, Crown, EyeOff } from 'lucide-react';
import { WorkspaceProvider, useWorkspace } from '../../context/WorkspaceContext';
import { getSection, sectionPath } from '../../data/workspaceNav';
import { Badge, Button, PageLoader, EmptyState, Alert } from '../../components/ui';
import { CheckoutDialog } from '../../components/billing/Checkout';
import { describeBilling } from '../../utils/billing';
import { isCampaignVisible } from '../../utils/campaignHelpers';

const SECTIONS = {
  overview: lazy(() => import('./Overview')),
  voters: lazy(() => import('./Voters')),
  field: lazy(() => import('./FieldTeam')),
  'election-day': lazy(() => import('./ElectionDay')),
  messages: lazy(() => import('./Messages')),
  ads: lazy(() => import('./Ads')),
  events: lazy(() => import('./Events')),
  fundraising: lazy(() => import('./Fundraising')),
  insights: lazy(() => import('./Insights')),
  studio: lazy(() => import('./Studio')),
  page: lazy(() => import('./PageEditor')),
  billing: lazy(() => import('./Billing')),
};

function BillingBanner() {
  const { campaign, billing } = useWorkspace();
  const [open, setOpen] = useState(false);
  const { state, daysLeft } = billing;

  let alert = null;
  if (state === 'trialing' && daysLeft <= 3) {
    alert = { tone: 'gold', icon: Clock, title: `Your free trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`, text: 'Subscribe now — your remaining trial days are added on top.' };
  } else if (state === 'active' && billing.renewSoon && !billing.autoRenew && !billing.legacy) {
    alert = { tone: 'gold', icon: Clock, title: `Pro renews in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`, text: 'Pay early with MoMo or card — time is added on top of your current period.' };
  } else if (state === 'grace') {
    alert = { tone: 'warning', icon: TriangleAlert, title: billing.wasTrial ? 'Your free trial has ended' : 'Your Pro plan has ended', text: describeBilling(billing) };
  } else if (['expired', 'trial_ended', 'unpaid', 'inactive'].includes(state)) {
    alert = { tone: 'danger', icon: Crown, title: state === 'unpaid' ? 'This campaign page is not published yet' : 'Your campaign tools are paused', text: describeBilling(billing) };
  }
  if (!alert) return null;
  return (
    <>
      <Alert
        className="mb-6"
        tone={alert.tone}
        icon={alert.icon}
        title={alert.title}
        action={
          <Button size="sm" variant={alert.tone === 'danger' ? 'primary' : 'gold'} onClick={() => setOpen(true)}>
            {state === 'active' ? 'Renew now' : 'Choose a plan'}
          </Button>
        }
      >
        {alert.text}
      </Alert>
      <CheckoutDialog open={open} onClose={() => setOpen(false)} campaign={campaign} />
    </>
  );
}

function WorkspaceBody({ section }) {
  const { campaign, loading, error, billing } = useWorkspace();
  const Section = SECTIONS[section];

  if (loading) return <PageLoader label="Opening your campaign…" />;
  if (error || !campaign) {
    return (
      <EmptyState
        icon={TriangleAlert}
        title={error === 'forbidden' ? 'You don’t have access to this campaign' : 'Campaign not found'}
        text="It may have been removed, or it belongs to another account."
        action={<Button to="/dashboard">Back to dashboard</Button>}
      />
    );
  }
  if (!Section) return <Navigate to={sectionPath(campaign.id)} replace />;

  const live = isCampaignVisible(campaign);
  const meta = getSection(section);

  return (
    <div className="animate-fade-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-3 mb-1.5">
            <span className="truncate max-w-[60vw]">{campaign.title}</span>
            <Badge tone={billing.tone}>{billing.label}</Badge>
            {live ? (
              <Badge tone="success">Page live</Badge>
            ) : (
              <Badge tone="neutral" icon={EyeOff}>Page offline</Badge>
            )}
          </div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold text-ink leading-tight">{meta.label}</h1>
        </div>
        {campaign.slug && (
          <Link
            to={`/campaign/${campaign.slug}`}
            target="_blank"
            className="btn btn-secondary btn-sm self-start sm:self-auto"
          >
            <ExternalLink className="w-4 h-4" /> View public page
          </Link>
        )}
      </div>
      {section !== 'billing' && <BillingBanner />}
      <ErrorBoundary resetKey={section} compact>
        <Suspense fallback={<PageLoader />}>
          <Section />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

export default function WorkspacePage({ mock }) {
  const { campaignId, section = 'overview' } = useParams();
  return (
    <WorkspaceProvider key={campaignId} campaignId={campaignId} mock={mock}>
      <WorkspaceBody section={section} />
    </WorkspaceProvider>
  );
}
