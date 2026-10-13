import {
  LayoutDashboard,
  Users,
  Footprints,
  Vote,
  Send,
  Target,
  CalendarDays,
  HandCoins,
  ChartColumn,
  Sparkles,
  Globe,
  CreditCard,
} from 'lucide-react';

export const WORKSPACE_SECTIONS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, group: 'Command centre' },
  { id: 'voters', label: 'Voters', icon: Users, group: 'Command centre', pro: true },
  { id: 'field', label: 'Field team', icon: Footprints, group: 'Command centre', pro: true },
  { id: 'election-day', label: 'Election day', icon: Vote, group: 'Command centre', pro: true },
  { id: 'messages', label: 'Messages', icon: Send, group: 'Outreach', pro: true },
  { id: 'ads', label: 'Ads & reach', icon: Target, group: 'Outreach', pro: true },
  { id: 'events', label: 'Events', icon: CalendarDays, group: 'Outreach', pro: true },
  { id: 'fundraising', label: 'Fundraising', icon: HandCoins, group: 'Outreach', pro: true },
  { id: 'insights', label: 'Insights', icon: ChartColumn, group: 'Intelligence', pro: true },
  { id: 'studio', label: 'AI Studio', icon: Sparkles, group: 'Intelligence', pro: true },
  { id: 'page', label: 'Campaign page', icon: Globe, group: 'Setup' },
  { id: 'billing', label: 'Plan & billing', icon: CreditCard, group: 'Setup' },
];

export function getSection(id) {
  return WORKSPACE_SECTIONS.find((s) => s.id === id) || WORKSPACE_SECTIONS[0];
}

export function sectionPath(campaignId, sectionId = 'overview') {
  return sectionId === 'overview' ? `/dashboard/${campaignId}` : `/dashboard/${campaignId}/${sectionId}`;
}
