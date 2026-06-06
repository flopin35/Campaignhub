/**
 * Parse referral source from URL search params.
 * ?ref=qr | whatsapp | facebook | twitter | telegram | linkedin | direct
 */
export function getReferralSource(searchParams) {
  const ref = searchParams?.get?.('ref') || searchParams?.ref;
  const valid = ['qr', 'whatsapp', 'facebook', 'twitter', 'telegram', 'linkedin', 'direct'];
  return valid.includes(ref) ? ref : 'direct';
}

export function buildCampaignUrl(slug, platform = null) {
  const base = `${window.location.origin}/campaign/${slug}`;
  if (!platform || platform === 'direct') return base;
  return `${base}?ref=${platform}`;
}

export function getWhatsAppShareText(slug) {
  const url = buildCampaignUrl(slug, 'whatsapp');
  return `Support this campaign:\n${url}`;
}

export const SHARE_PLATFORMS = [
  { id: 'whatsapp', label: 'WhatsApp', color: 'hover:bg-green-500/20 hover:border-green-500/30' },
  { id: 'facebook', label: 'Facebook', color: 'hover:bg-blue-500/20 hover:border-blue-500/30' },
  { id: 'twitter', label: 'X / Twitter', color: 'hover:bg-gray-500/20 hover:border-gray-400/30' },
  { id: 'telegram', label: 'Telegram', color: 'hover:bg-sky-500/20 hover:border-sky-500/30' },
  { id: 'linkedin', label: 'LinkedIn', color: 'hover:bg-blue-600/20 hover:border-blue-600/30' },
];

export function getShareUrl(platform, slug, title) {
  const url = buildCampaignUrl(slug, platform);
  const encoded = encodeURIComponent(url);

  switch (platform) {
    case 'whatsapp': {
      const text = encodeURIComponent(getWhatsAppShareText(slug));
      return `https://wa.me/?text=${text}`;
    }
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encoded}`;
    case 'twitter': {
      const text = encodeURIComponent(`Support our campaign: ${title}`);
      return `https://twitter.com/intent/tweet?text=${text}&url=${encoded}`;
    }
    case 'telegram': {
      const text = encodeURIComponent(`Support our campaign: ${title}`);
      return `https://t.me/share/url?url=${encoded}&text=${text}`;
    }
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`;
    default:
      return url;
  }
}
