import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePremiumModal } from '../context/PremiumModalContext';
import { useToast } from '../context/ToastContext';
import { hasCampaignCrm, canAccessWorkspaceTab, canAccessDistribution, canAccessCrm } from '../utils/featureAccess';
import PremiumGate from './PremiumGate';
import { subscribeSupporters, aggregateSupportersByRegion, aggregateSupportersByConstituency } from '../services/supporterService';
import { subscribeDonations, getDonationStats, verifyDonation } from '../services/donationService';
import { subscribeVolunteers, updateVolunteerStatus, getVolunteerStats } from '../services/volunteerService';
import { subscribeEvents, createEvent } from '../services/eventService';
import { buildWhatsAppBroadcast, buildSmsBroadcast, buildEmailBroadcast, filterSupporters } from '../services/broadcastService';
import { GHANA_REGIONS } from '../data/ghanaRegions';
import AnalyticsDashboard from './AnalyticsDashboard';
import MultiPlatformDistribution from './MultiPlatformDistribution';
import AIUploadHelper from './AIUploadHelper';
import {
  Users, Wallet, Calendar, MapPin, BarChart3, Lock, ExternalLink, Zap, Share2,
} from 'lucide-react';

const TABS = [
  { id: 'overview', label: 'Overview', short: 'Home', icon: MapPin, premium: false },
  { id: 'distribute', label: 'Share formats', short: 'Share', icon: Share2, premium: true, feature: 'distribute' },
  { id: 'analytics', label: 'Page stats', short: 'Stats', icon: BarChart3, premium: false },
  { id: 'events', label: 'Events', short: 'Events', icon: Calendar, premium: true, feature: 'crm' },
  { id: 'supporters', label: 'Supporters', short: 'Fans', icon: Users, premium: true, feature: 'crm' },
  { id: 'donations', label: 'Donations', short: 'MoMo', icon: Wallet, premium: true, feature: 'crm' },
];

export default function CampaignWorkspace({
  campaign,
  activeTab = 'overview',
  onTabChange,
  compact = false,
  onExtend,
  onDelete,
}) {
  const { openPremiumModal, openAdBoostModal } = usePremiumModal();
  const { toast } = useToast();
  const [tab, setTab] = useState(activeTab);
  const [supporters, setSupporters] = useState([]);
  const [donations, setDonations] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [events, setEvents] = useState([]);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [eventForm, setEventForm] = useState({ title: '', venue: '', region: '', eventDate: '' });
  const [creatingEvent, setCreatingEvent] = useState(false);

  const crmUnlocked = hasCampaignCrm(campaign);
  const distributeUnlocked = canAccessDistribution(campaign);
  const donationStats = getDonationStats(donations);
  const volunteerStats = getVolunteerStats(volunteers);
  const byRegion = aggregateSupportersByRegion(supporters);
  const byConstituency = aggregateSupportersByConstituency(supporters);

  useEffect(() => {
    setTab(activeTab);
  }, [activeTab, campaign?.id]);

  useEffect(() => {
    if (!campaign?.id) return undefined;
    const u1 = subscribeSupporters(campaign.id, setSupporters);
    const u2 = subscribeDonations(campaign.id, setDonations);
    const u3 = subscribeVolunteers(campaign.id, setVolunteers);
    const u4 = subscribeEvents(campaign.id, setEvents);
    return () => { u1(); u2(); u3(); u4(); };
  }, [campaign?.id]);

  const setActiveTab = (id) => {
    setTab(id);
    onTabChange?.(id);
  };

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center min-h-[320px]">
        <LayoutPlaceholder />
        <p className="text-sm text-gray-500 mt-4 max-w-xs">Select a campaign page from the list to view stats, share your official link, and manage your page.</p>
      </div>
    );
  }

  const filtered = filterSupporters(supporters, { region: filterRegion || null });
  const wa = buildWhatsAppBroadcast({ campaign, message: broadcastMsg, supporters: filtered });
  const emails = filtered.map((s) => s.email).filter(Boolean);

  const handleVerifyDonation = async (d) => {
    try {
      await verifyDonation(d.id, {
        ownerId: campaign.ownerId,
        campaignTitle: campaign.title,
        donorName: d.donorName,
        amount: d.amount,
      });
      toast('Donation confirmed', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleVolunteerStatus = async (id, status) => {
    try {
      await updateVolunteerStatus(id, status);
      toast(`Volunteer ${status}`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.eventDate) {
      toast('Title and date required', 'warning');
      return;
    }
    setCreatingEvent(true);
    try {
      await createEvent({ campaignId: campaign.id, ...eventForm });
      setEventForm({ title: '', venue: '', region: '', eventDate: '' });
      toast('Event created', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setCreatingEvent(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Campaign header */}
      <div className="flex flex-col gap-3">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-white line-clamp-2">{campaign.title}</h2>
          <p className="text-xs text-gray-500 mt-0.5 capitalize">{campaign.status?.replace(/_/g, ' ')} · {campaign.views || 0} views</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openAdBoostModal({ campaign })}
            className="btn-primary text-xs py-2.5 px-3 inline-flex items-center justify-center gap-1.5 col-span-2 sm:col-span-1 border-amber-500/30 bg-amber-600/20 hover:bg-amber-600/30"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" /> Boost visibility
          </button>
          <Link to={`/campaign/${campaign.slug}`} className="btn-secondary text-xs py-2.5 px-3 inline-flex items-center justify-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" /> View official page
          </Link>
          {campaign.status === 'active' && onExtend && (
            <button type="button" onClick={onExtend} className="btn-secondary text-xs py-2.5 px-3">Extend</button>
          )}
          {onDelete && (
            <button type="button" onClick={onDelete} className="text-xs py-2.5 px-3 min-h-[44px] rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 touch-manipulation">
              {campaign.status === 'active' && !campaign.isExpired ? 'Hide page' : 'Remove archived page'}
            </button>
          )}
        </div>
      </div>

      {!crmUnlocked && (
        <div className="p-3 rounded-xl bg-brand-600/10 border border-brand-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Lock className="w-4 h-4 text-brand-400 shrink-0" />
            <p className="text-xs text-gray-400">Free plan: overview &amp; basic stats. Upgrade for sharing formats, page analytics &amp; supporter tools.</p>
          </div>
          <button type="button" onClick={() => openPremiumModal({ campaign, planId: 'premium-subscription' })} className="btn-primary text-xs py-2.5 px-4 w-full sm:w-auto shrink-0">
            Upgrade ₵500/mo
          </button>
        </div>
      )}

      {/* Mini stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'Views', value: campaign.views || 0, color: 'text-gray-300' },
          { label: 'Supporters', value: supporters.length, color: 'text-brand-400' },
          { label: 'Raised', value: `₵${donationStats.totalRaised}`, color: 'text-emerald-400' },
          { label: 'Events', value: events.length, color: 'text-purple-400' },
        ].map((s) => (
          <div key={s.label} className="bg-surface-elevated/60 rounded-lg py-2.5 px-2 text-center border border-surface-border/50">
            <div className={`text-sm sm:text-base font-bold ${s.color} truncate`}>{s.value}</div>
            <div className="text-[9px] text-gray-500 mt-0.5 uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs — horizontal scroll on mobile */}
      <div className="mobile-scroll-x -mx-1 px-1">
        <div className="flex gap-1 min-w-max border-b border-surface-border">
          {TABS.map(({ id, label, short, icon: Icon, premium }) => {
            const locked = premium && !canAccessWorkspaceTab(campaign, id);
            return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-3 min-h-[44px] text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap touch-manipulation ${
                tab === id
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              } ${locked ? 'opacity-80' : ''}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="sm:hidden">{short}</span>
              <span className="hidden sm:inline">{label}</span>
              {locked && <Lock className="w-3 h-3 text-brand-400/70 shrink-0" />}
            </button>
            );
          })}
        </div>
      </div>

      {/* Tab panels */}
      <div className={compact ? '' : 'min-h-[280px]'}>
        {tab === 'overview' && (
          <div className="grid sm:grid-cols-2 gap-4">
            {crmUnlocked ? (
              <>
                <Panel title="Sign-ups by region" icon={MapPin}>
                  {byRegion.length === 0 ? (
                    <Empty text="Share your official campaign link to collect supporter sign-ups." />
                  ) : (
                    <DataList items={byRegion.slice(0, 6).map(({ region, count }) => ({ label: region, value: count }))} />
                  )}
                </Panel>
                <Panel title="Top donations" icon={Wallet}>
                  {donationStats.leaderboard.length === 0 ? (
                    <Empty text="No confirmed donations yet." />
                  ) : (
                    <DataList items={donationStats.leaderboard.slice(0, 5).map(({ name, amount }, i) => ({ label: `#${i + 1} ${name}`, value: `₵${amount}`, valueClass: 'text-emerald-400' }))} />
                  )}
                </Panel>
                {byConstituency.length > 0 && (
                  <Panel title="Sign-ups by constituency" icon={MapPin} className="sm:col-span-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {byConstituency.slice(0, 6).map(({ constituency, count }) => (
                        <div key={constituency} className="bg-surface-elevated rounded-lg px-2.5 py-2 flex justify-between text-xs gap-2">
                          <span className="text-gray-400 truncate">{constituency}</span>
                          <span className="text-white font-medium shrink-0">{count}</span>
                        </div>
                      ))}
                    </div>
                  </Panel>
                )}
              </>
            ) : (
              <>
                <Panel title="Quick stats" icon={BarChart3}>
                  <DataList items={[
                    { label: 'Page views', value: campaign.views || 0 },
                    { label: 'Supporters', value: supporters.length },
                    { label: 'Donations confirmed', value: `₵${donationStats.totalRaised}` },
                  ]} />
                </Panel>
                <div className="sm:col-span-1">
                  <PremiumGate campaign={campaign} feature="crm" compact />
                </div>
                <div className="sm:col-span-2">
                  <PremiumGate campaign={campaign} feature="distribute" compact />
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'distribute' && (
          distributeUnlocked ? (
            <div className="space-y-4">
              <AIUploadHelper
                form={{
                  title: campaign.title,
                  description: campaign.description || '',
                  category: campaign.category || 'General',
                  campaignType: campaign.campaignType || 'Awareness',
                }}
                campaign={campaign}
                onApply={() => toast('Copied — paste into your post', 'info')}
              />
              <MultiPlatformDistribution campaign={campaign} />
            </div>
          ) : (
            <PremiumGate campaign={campaign} feature="distribute" />
          )
        )}

        {tab === 'analytics' && <AnalyticsDashboard campaign={campaign} />}

        {tab === 'supporters' && (
          canAccessCrm(campaign) ? (
            <DataTable
              headers={['Name', 'Phone', 'Region', 'Constituency', 'Volunteer']}
              rows={supporters.map((s) => [s.name, s.phone, s.region || '—', s.constituency || '—', s.isVolunteer ? 'Yes' : '—'])}
              empty="No supporters yet"
            />
          ) : (
            <PremiumGate campaign={campaign} feature="crm" title={`${supporters.length} supporters waiting`} description="Upgrade to view supporter sign-ups, filter by region, and send updates." />
          )
        )}

        {tab === 'donations' && (
          canAccessCrm(campaign) ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <MiniStat label="Confirmed" value={`₵${donationStats.totalRaised}`} color="text-emerald-400" />
              <MiniStat label="Donors" value={donationStats.donorCount} />
              <MiniStat label="Pending" value={donationStats.pendingCount} color="text-amber-400" />
            </div>
            <DataTable
              headers={['Donor', 'Amount', 'Ref', 'Status', '']}
              rows={donations.map((d) => [
                d.anonymous ? 'Anonymous' : d.donorName,
                `₵${d.amount}`,
                d.paymentReference,
                d.paymentStatus,
                d.paymentStatus === 'pending_review' ? (
                  <button type="button" onClick={() => handleVerifyDonation(d)} className="text-xs text-brand-400">Confirm payment</button>
                ) : null,
              ])}
              empty="No donations yet"
            />
          </div>
          ) : (
            <PremiumGate campaign={campaign} feature="crm" title={`₵${donationStats.totalRaised} raised`} description="Upgrade to verify MoMo donations, see donor details, and manage your leaderboard." />
          )
        )}

        {tab === 'volunteers' && (
          canAccessCrm(campaign) ? (
          <DataTable
            headers={['Name', 'Phone', 'Region', 'Status', 'Actions']}
            rows={volunteers.map((v) => [
              v.name,
              v.phone,
              v.region || '—',
              v.status,
              <VolunteerActions key={v.id} volunteer={v} onStatus={handleVolunteerStatus} />,
            ])}
            empty="No volunteers yet"
          />
          ) : (
            <PremiumGate campaign={campaign} feature="crm" title={`${volunteerStats.active} active volunteers`} description="Upgrade to review and manage volunteer sign-ups." />
          )
        )}

        {tab === 'events' && (
          canAccessCrm(campaign) ? (
            <div className="space-y-4">
              <form onSubmit={handleCreateEvent} className="glass-card grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
                <input className="input-field text-sm" placeholder="Event title *" value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} required />
                <input className="input-field text-sm" type="datetime-local" value={eventForm.eventDate} onChange={(e) => setEventForm({ ...eventForm, eventDate: e.target.value })} required />
                <input className="input-field text-sm" placeholder="Venue" value={eventForm.venue} onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })} />
                <select className="input-field text-sm" value={eventForm.region} onChange={(e) => setEventForm({ ...eventForm, region: e.target.value })}>
                  <option value="">Region</option>
                  {GHANA_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <button type="submit" disabled={creatingEvent} className="btn-primary text-sm sm:col-span-2 disabled:opacity-50">
                  {creatingEvent ? 'Creating…' : 'Create event'}
                </button>
              </form>
              {events.map((ev) => (
                <div key={ev.id} className="glass-card p-4 flex justify-between items-start gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{ev.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{ev.venue || 'TBA'} · RSVP {ev.rsvpCount || 0}</p>
                  </div>
                  <Link to={`/campaign/${campaign.slug}`} className="text-xs text-brand-400 shrink-0">Share →</Link>
                </div>
              ))}
              {events.length === 0 && <Empty text="No events scheduled" />}
            </div>
          ) : (
            <PremiumGate campaign={campaign} feature="crm" title={`${events.length} events`} description="Upgrade to schedule events and share event links on your official page." />
          )
        )}

        {tab === 'broadcast' && (
          canAccessCrm(campaign) ? (
            <div className="glass-card p-4 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <select className="input-field text-sm" value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)}>
                  <option value="">All supporters ({supporters.length})</option>
                  {GHANA_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <p className="text-sm text-gray-400 flex items-center">{filtered.length} targeted</p>
              </div>
              <textarea className="input-field text-sm resize-none" rows={3} placeholder="Campaign update message…" value={broadcastMsg} onChange={(e) => setBroadcastMsg(e.target.value)} />
              <div className="flex flex-col sm:flex-row gap-2">
                <a href={wa.waLink} target="_blank" rel="noopener noreferrer" className="btn-primary text-xs py-2.5 flex-1 text-center">WhatsApp</a>
                <a href={buildSmsBroadcast({ campaign, message: broadcastMsg }).smsLink} className="btn-secondary text-xs py-2.5 flex-1 text-center">SMS</a>
                {emails.length > 0 && (
                  <a href={buildEmailBroadcast({ campaign, message: broadcastMsg, emails }).mailtoLink} className="btn-secondary text-xs py-2.5 flex-1 text-center">
                    Email ({emails.length})
                  </a>
                )}
              </div>
            </div>
          ) : (
            <PremiumGate campaign={campaign} feature="crm" title={`Reach ${supporters.length} supporters`} description="Upgrade to send WhatsApp, SMS, and email updates to your supporter list." />
          )
        )}
      </div>
    </div>
  );
}

function LayoutPlaceholder() {
  return (
    <div className="w-14 h-14 rounded-2xl bg-surface-elevated border border-surface-border flex items-center justify-center">
      <BarChart3 className="w-7 h-7 text-gray-600" />
    </div>
  );
}

function Panel({ title, icon: Icon, children, className = '' }) {
  return (
    <div className={`glass-card p-4 ${className}`}>
      <h3 className="text-xs font-medium text-gray-400 mb-3 flex items-center gap-1.5 uppercase tracking-wide">
        <Icon className="w-3.5 h-3.5" /> {title}
      </h3>
      {children}
    </div>
  );
}

function Empty({ text }) {
  return <p className="text-sm text-gray-600">{text}</p>;
}

function DataList({ items, valueClass = 'text-white' }) {
  return (
    <ul className="space-y-2">
      {items.map(({ label, value, valueClass: vc }) => (
        <li key={label} className="flex justify-between text-sm gap-2">
          <span className="text-gray-400 truncate">{label}</span>
          <span className={`font-medium shrink-0 ${vc || valueClass}`}>{value}</span>
        </li>
      ))}
    </ul>
  );
}

function MiniStat({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-surface-elevated rounded-lg py-2 text-center border border-surface-border/50">
      <div className={`text-sm font-bold ${color}`}>{value}</div>
      <div className="text-[9px] text-gray-500 uppercase">{label}</div>
    </div>
  );
}

function DataTable({ headers, rows, empty }) {
  if (!rows.length) return <div className="glass-card p-6 sm:p-8 text-center"><Empty text={empty} /></div>;

  return (
    <>
      <div className="sm:hidden space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="rounded-xl border border-surface-border bg-surface-elevated/50 p-4 space-y-2.5">
            {headers.map((h, j) => {
              if (!h || row[j] == null || row[j] === '') return null;
              return (
                <div key={j} className="flex justify-between items-start gap-3 text-sm">
                  <span className="text-gray-500 shrink-0">{h}</span>
                  <span className="text-gray-200 text-right break-all">{row[j]}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="hidden sm:block glass-card overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-surface-border">
              {headers.map((h) => <th key={h} className="pb-3 pr-4 font-medium whitespace-nowrap">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-surface-border/40">
                {row.map((cell, j) => (
                  <td key={j} className="py-2.5 pr-4 text-gray-300">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function VolunteerActions({ volunteer, onStatus }) {
  const btn = 'text-xs py-2 px-2 min-h-[36px] touch-manipulation';
  if (volunteer.status === 'pending') {
    return (
      <span className="flex flex-wrap gap-2 justify-end">
        <button type="button" onClick={() => onStatus(volunteer.id, 'approved')} className={`${btn} text-emerald-400`}>Approve</button>
        <button type="button" onClick={() => onStatus(volunteer.id, 'inactive')} className={`${btn} text-red-400`}>Reject</button>
      </span>
    );
  }
  if (volunteer.status === 'approved') {
    return <button type="button" onClick={() => onStatus(volunteer.id, 'active')} className={`${btn} text-brand-400`}>Activate</button>;
  }
  return '—';
}
