import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Vote,
  HandCoins,
  Eye,
  CalendarDays,
  Footprints,
  CircleCheck,
  Circle,
  ArrowRight,
  Upload,
  Send,
  Target,
  Sparkles,
  UserPlus,
  Flag,
} from 'lucide-react';
import { useWorkspace, useWorkspaceData } from '../../context/WorkspaceContext';
import { Card, CardHeader, Badge, Button, EmptyState } from '../../components/ui';
import { StatTile, Meter, SupportBar, BarList } from '../../components/charts';
import { pathToVictory, daysToElection, stationBreakdown, getSupportLevel } from '../../utils/projection';
import { getDonationStats } from '../../services/donationService';
import { sectionPath } from '../../data/workspaceNav';
import { compactNumber, formatNumber, cedis, timeAgo, formatDateTime } from '../../utils/format';
import { toMs } from '../../utils/billing';

const SOURCE_LABEL = {
  campaign_page: 'Public page',
  field: 'Field team',
  import: 'Import',
  manual: 'Added',
};

export default function Overview() {
  const { campaign } = useWorkspace();
  const { rows: voters } = useWorkspaceData('voters');
  const { rows: volunteers } = useWorkspaceData('volunteers');
  const { rows: donations } = useWorkspaceData('donations');
  const { rows: events } = useWorkspaceData('events');
  const { rows: stations } = useWorkspaceData('stations');
  const { rows: fieldLinks } = useWorkspaceData('fieldLinks');
  const { rows: analytics } = useWorkspaceData('analytics', null);

  const ptv = useMemo(() => pathToVictory(campaign, voters), [campaign, voters]);
  const days = daysToElection(campaign);
  const donationStats = getDonationStats(donations);
  const weekAgo = Date.now() - 7 * 86400000;
  const newThisWeek = voters.filter((v) => toMs(v.createdAt) > weekAgo).length;
  const upcoming = events
    .filter((e) => new Date(e.eventDate).getTime() > Date.now() - 3 * 3600000)
    .slice(0, 3);
  const areas = stationBreakdown(voters, voters.some((v) => v.pollingStation) ? 'pollingStation' : 'region')
    .filter((a) => a.name !== 'Unassigned')
    .slice(0, 6);
  const p = (s) => sectionPath(campaign.id, s);

  const checklist = [
    { done: !!campaign.electionDate && !!campaign.voteTarget, label: 'Set your election date and win number', to: p('page') + '#strategy' },
    { done: voters.length >= 25, label: 'Add your first 25 voters (or import a list)', to: p('voters') },
    { done: fieldLinks.some((f) => f.mode === 'canvass'), label: 'Send a canvassing link to a volunteer', to: p('field') },
    { done: stations.length > 0, label: 'Add your polling stations', to: p('election-day') },
    { done: (campaign.views || 0) >= 20, label: 'Share your page link & QR code (20 visits)', to: p('page') },
    { done: events.length > 0, label: 'Schedule your next rally or town hall', to: p('events') },
  ];
  const remaining = checklist.filter((c) => !c.done).length;
  const weekVisits = Object.entries(analytics?.daily || {})
    .filter(([k]) => {
      const d = new Date(`${k.slice(1, 5)}-${k.slice(5, 7)}-${k.slice(7, 9)}T12:00:00`);
      return d.getTime() > weekAgo;
    })
    .reduce((s2, [, v]) => s2 + (Number(v) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatTile label="Voters in CRM" value={compactNumber(voters.length)} icon={Users} sub={newThisWeek ? `+${formatNumber(newThisWeek)} this week` : 'Add or import voters'} />
        <StatTile label="Projected votes" value={compactNumber(ptv.projected)} icon={Vote} sub={ptv.target ? `of ${compactNumber(ptv.target)} needed` : 'Set a win number'} accent />
        <StatTile label="Raised" value={cedis(donationStats.totalRaised)} icon={HandCoins} sub={`${formatNumber(donationStats.donorCount)} confirmed gifts`} />
        <StatTile
          label={days != null && days >= 0 ? 'Days to election' : 'Page views'}
          value={days != null && days >= 0 ? formatNumber(days) : compactNumber(campaign.views)}
          icon={days != null && days >= 0 ? Flag : Eye}
          sub={days != null && days >= 0 ? `${compactNumber(campaign.views)} page views` : `${formatNumber(analytics?.qrScans || 0)} QR scans`}
        />
      </div>

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <Card>
          <CardHeader
            title="Path to victory"
            subtitle="Projected votes from everyone in your CRM, weighted by support level."
            action={<Button size="sm" variant="secondary" to={p('voters')}>Open voters</Button>}
          />
          {ptv.target ? (
            <>
              <div className="flex items-end justify-between gap-4 mb-3">
                <div>
                  <p className="text-4xl font-extrabold font-display text-ink">{formatNumber(ptv.projected)}</p>
                  <p className="text-sm text-ink-3 mt-1">projected of {formatNumber(ptv.target)} votes to win</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-ink">{Math.round(ptv.progress * 100)}%</p>
                  <p className="text-xs text-ink-3">{ptv.gap ? `${formatNumber(ptv.gap)} to go` : 'Target reached'}</p>
                </div>
              </div>
              <Meter value={ptv.projected} max={ptv.target} size="lg" />
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-line-strong p-5 text-sm text-ink-2 mb-2">
              Set your <strong className="text-ink">win number</strong> (votes needed to win) to track progress.{' '}
              <Link to={p('page') + '#strategy'} className="text-link font-medium">Set it now →</Link>
            </div>
          )}
          <div className="mt-6">
            <p className="text-sm font-medium text-ink mb-2.5">Voter support breakdown</p>
            <SupportBar counts={ptv.counts} />
          </div>
        </Card>

        {remaining ? (
          <Card>
            <CardHeader title="Getting started" subtitle={`${remaining} step${remaining === 1 ? '' : 's'} to a fully running campaign`} />
            <ul className="space-y-1">
              {checklist.map((c) => (
                <li key={c.label}>
                  <Link to={c.to} className="flex items-center gap-3 rounded-lg px-2 py-2 -mx-2 hover:bg-surface-2 group">
                    {c.done ? (
                      <CircleCheck className="w-5 h-5 text-success shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-line-strong shrink-0" />
                    )}
                    <span className={c.done ? 'text-sm text-ink-3 line-through' : 'text-sm text-ink'}>{c.label}</span>
                    {!c.done && <ArrowRight className="w-4 h-4 text-ink-3 ml-auto opacity-0 group-hover:opacity-100" />}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <Card>
            <CardHeader title="This week" subtitle="Last 7 days across your campaign" />
            <ul className="divide-y divide-line">
              {[
                ['New voters in CRM', formatNumber(newThisWeek)],
                ['Doors & calls logged', formatNumber(voters.filter((v) => toMs(v.lastContactAt) > weekAgo).length)],
                ['Page visits', formatNumber(weekVisits)],
                ['Gifts confirmed', cedis(donations.filter((d) => d.paymentStatus === 'verified' && toMs(d.createdAt) > weekAgo).reduce((s2, d) => s2 + (d.amount || 0), 0))],
                ['Persuadable voters (leaning + undecided)', formatNumber(ptv.counts.leaning + ptv.counts.undecided)],
              ].map(([k, v]) => (
                <li key={k} className="py-3 flex items-center justify-between gap-4 text-sm">
                  <span className="text-ink-2">{k}</span>
                  <span className="font-semibold text-ink num">{v}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { icon: UserPlus, label: 'Add a voter', to: p('voters') + '?add=1' },
          { icon: Upload, label: 'Import a list', to: p('voters') + '?import=1' },
          { icon: Send, label: 'Message supporters', to: p('messages') },
          { icon: Target, label: 'Track an ad', to: p('ads') },
          { icon: Sparkles, label: 'Write a speech', to: p('studio') },
        ].map((a) => (
          <Link key={a.label} to={a.to} className="card card-hover p-4 flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-primary-soft text-ink flex items-center justify-center shrink-0">
              <a.icon className="w-[18px] h-[18px]" />
            </span>
            <span className="text-sm font-semibold text-ink">{a.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader title="Latest supporters" subtitle="Sign-ups, field entries and imports" />
          {voters.length === 0 ? (
            <EmptyState compact icon={Users} text="Share your page or send a canvassing link to start collecting supporters." />
          ) : (
            <ul className="divide-y divide-line -my-2">
              {voters.slice(0, 6).map((v) => (
                <li key={v.id} className="py-2.5 flex items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink truncate">{v.name}</span>
                    <span className="block text-xs text-ink-3 truncate">
                      {[v.pollingStation || v.constituency || v.region, SOURCE_LABEL[v.source] || v.source].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="text-xs text-ink-3 shrink-0">{timeAgo(v.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title={voters.some((v) => v.pollingStation) ? 'Top polling stations' : 'Top regions'} subtitle="By voters in your CRM" />
          <BarList items={areas.map((a) => ({ label: a.name, value: a.total }))} emptyText="Add polling stations to your voters to see where you're strong." />
        </Card>

        <Card>
          <CardHeader title="Coming up" action={<Button size="sm" variant="ghost" to={p('events')}>All events</Button>} />
          {upcoming.length === 0 ? (
            <EmptyState compact icon={CalendarDays} text="No events scheduled." action={<Button size="sm" variant="secondary" to={p('events')}>Schedule one</Button>} />
          ) : (
            <ul className="space-y-3">
              {upcoming.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className="w-11 shrink-0 rounded-lg border border-line text-center py-1">
                    <span className="block text-[10px] uppercase text-ink-3">
                      {new Date(e.eventDate).toLocaleDateString('en-GH', { month: 'short' })}
                    </span>
                    <span className="block text-base font-bold text-ink leading-tight">{new Date(e.eventDate).getDate()}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink truncate">{e.title}</span>
                    <span className="block text-xs text-ink-3 truncate">{formatDateTime(e.eventDate)} · {e.venue || 'Venue TBC'}</span>
                    <span className="block text-xs text-ink-3">{formatNumber(e.rsvpCount || 0)} RSVPs</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="divider my-4" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-3 inline-flex items-center gap-2"><Footprints className="w-4 h-4" /> Volunteers</span>
            <span className="font-semibold text-ink">{formatNumber(volunteers.length)}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-ink-3">Most common support level</span>
            <Badge tone="neutral">{getSupportLevel(Object.entries(ptv.counts).sort((a, b) => b[1] - a[1])[0]?.[0]).short}</Badge>
          </div>
        </Card>
      </div>
    </div>
  );
}
