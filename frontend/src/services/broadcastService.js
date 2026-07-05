import { buildCampaignUrl } from '../utils/sharing';

/** Build WhatsApp broadcast message for supporter mobilization (Ghana-first). */
export function buildWhatsAppBroadcast({ campaign, message, supporters = [] }) {
  const base = buildCampaignUrl(campaign.slug);
  const text = [
    message || `Support our campaign: ${campaign.title}`,
    '',
    base,
    '',
    '— Sent via CampaignHub',
  ].join('\n');

  return {
    text,
    waLink: `https://wa.me/?text=${encodeURIComponent(text)}`,
    supporterCount: supporters.length,
    withPhone: supporters.filter((s) => s.phone).length,
  };
}

/** Build SMS-style message (opens default SMS app on mobile with body pre-filled). */
export function buildSmsBroadcast({ campaign, message, phone = '' }) {
  const base = buildCampaignUrl(campaign.slug);
  const body = `${message || campaign.title}\n${base}`;
  const digits = phone.replace(/\D/g, '');
  const link = digits
    ? `sms:${digits}?body=${encodeURIComponent(body)}`
    : `sms:?body=${encodeURIComponent(body)}`;
  return { body, smsLink: link };
}

/** Build mailto for email broadcast to supporters with email addresses. */
export function buildEmailBroadcast({ campaign, subject, message, emails = [] }) {
  const base = buildCampaignUrl(campaign.slug);
  const body = `${message}\n\n${base}\n\n— CampaignHub`;
  const to = emails.filter(Boolean).join(',');
  return {
    mailtoLink: `mailto:${to}?subject=${encodeURIComponent(subject || `Support: ${campaign.title}`)}&body=${encodeURIComponent(body)}`,
    recipientCount: emails.length,
  };
}

/** Filter supporters for targeted mobilization. */
export function filterSupporters(supporters, { region, constituency, volunteersOnly, donorsOnly }) {
  return supporters.filter((s) => {
    if (region && s.region !== region) return false;
    if (constituency && s.constituency !== constituency) return false;
    if (volunteersOnly && !s.isVolunteer) return false;
    if (donorsOnly && !(s.donationCount > 0 || s.totalDonated > 0)) return false;
    return true;
  });
}
