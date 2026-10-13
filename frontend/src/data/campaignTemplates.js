/** Political campaign quick-start templates */
export const CAMPAIGN_TEMPLATES = [
  {
    id: 'parliamentary',
    label: 'Parliamentary',
    emoji: '🏛️',
    category: 'Politics',
    campaignType: 'Parliamentary',
    title: 'Vote [Candidate Name] — [Constituency]',
    description:
      'I am running to represent our constituency with integrity and action. Learn about my vision, track record, and how we will deliver together. Share this official page with your community.',
  },
  {
    id: 'presidential',
    label: 'Presidential',
    emoji: '🇬🇭',
    category: 'Politics',
    campaignType: 'Presidential',
    title: 'A Ghana we can believe in',
    description:
      'This is the official campaign page for our presidential ticket. Read our message, priorities, and news. Share this link so every Ghanaian knows where to find the truth about our campaign.',
  },
  {
    id: 'mmdce',
    label: 'MMDCE / Local',
    emoji: '🏘️',
    category: 'Politics',
    campaignType: 'MMDCE',
    title: 'Leadership for our community',
    description:
      'Running to serve at the local level with transparency and results. Find my biography, achievements, and official updates here — the trusted link for our area.',
  },
  {
    id: 'party-branch',
    label: 'Party branch',
    emoji: '🎗️',
    category: 'Politics',
    campaignType: 'Party',
    title: 'Official party campaign page',
    description:
      'The official digital presence for our party branch. News, events, and trusted updates for members and supporters. Share only this official campaign link for accurate information.',
  },
  {
    id: 'by-election',
    label: 'By-election',
    emoji: '🗳️',
    category: 'Politics',
    campaignType: 'Parliamentary',
    title: 'By-election — our moment to choose',
    description:
      'A by-election is approaching. This is the official campaign page with the candidate, campaign message, and how to stay informed until election day.',
  },
  {
    id: 'referendum',
    label: 'Referendum / issue',
    emoji: '📢',
    category: 'Politics',
    campaignType: 'Referendum',
    title: 'Know the facts — vote informed',
    description:
      'Official information about this national issue and why it matters. News, events, and trusted links — share this page so voters get the real message.',
  },
];

export function getTemplateById(id) {
  return CAMPAIGN_TEMPLATES.find((t) => t.id === id) || null;
}
