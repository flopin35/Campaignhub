/**
 * Campaign sharing — WhatsApp-first, tracked links.
 * ?ref=qr | whatsapp | facebook | twitter | telegram | linkedin | instagram | tiktok | direct
 */
export function getReferralSource(searchParams) {
  const ref = searchParams?.get?.('ref') || searchParams?.ref;
  const valid = [
    'qr', 'whatsapp', 'facebook', 'twitter', 'telegram', 'linkedin',
    'instagram', 'tiktok', 'direct',
  ];
  return valid.includes(ref) ? ref : 'direct';
}

export function buildCampaignUrl(slug, platform = null) {
  const base = `${window.location.origin}/campaign/${slug}`;
  if (!platform || platform === 'direct') return base;
  return `${base}?ref=${platform}`;
}

export function getWhatsAppShareText(slug, title = '') {
  const url = buildCampaignUrl(slug, 'whatsapp');
  const headline = title ? `🔥 ${title}\n\n` : '';
  return `${headline}Check this out on CampaignHub:\n${url}`;
}

export const SHARE_PLATFORMS = [
  { id: 'whatsapp', label: 'WhatsApp', color: 'hover:bg-green-500/20 hover:border-green-500/30', primary: true },
  { id: 'facebook', label: 'Facebook', color: 'hover:bg-blue-500/20 hover:border-blue-500/30' },
  { id: 'twitter', label: 'X / Twitter', color: 'hover:bg-gray-500/20 hover:border-gray-400/30' },
  { id: 'telegram', label: 'Telegram', color: 'hover:bg-sky-500/20 hover:border-sky-500/30' },
  { id: 'linkedin', label: 'LinkedIn', color: 'hover:bg-blue-600/20 hover:border-blue-600/30' },
];

export const COPY_PLATFORMS = [
  { id: 'instagram', label: 'Instagram', hint: 'Paste in caption or bio link' },
  { id: 'tiktok', label: 'TikTok', hint: 'Paste in video caption' },
  { id: 'sms', label: 'SMS', hint: 'Opens your SMS app' },
  { id: 'email', label: 'Email', hint: 'Opens your email app' },
];

export function getShareUrl(platform, slug, title) {
  const url = buildCampaignUrl(slug, platform === 'sms' || platform === 'email' ? 'direct' : platform);
  const encoded = encodeURIComponent(url);

  switch (platform) {
    case 'whatsapp': {
      const text = encodeURIComponent(getWhatsAppShareText(slug, title));
      return `https://wa.me/?text=${text}`;
    }
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encoded}`;
    case 'twitter': {
      const text = encodeURIComponent(`Support: ${title}`);
      return `https://twitter.com/intent/tweet?text=${text}&url=${encoded}`;
    }
    case 'telegram': {
      const text = encodeURIComponent(`Support: ${title}`);
      return `https://t.me/share/url?url=${encoded}&text=${text}`;
    }
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`;
    case 'sms': {
      const body = encodeURIComponent(`${title} — ${buildCampaignUrl(slug, 'direct')}`);
      return `sms:?body=${body}`;
    }
    case 'email': {
      const subject = encodeURIComponent(`Campaign: ${title}`);
      const body = encodeURIComponent(`Check this campaign:\n${buildCampaignUrl(slug, 'direct')}`);
      return `mailto:?subject=${subject}&body=${body}`;
    }
    default:
      return url;
  }
}

export function getCopyPack(slug, title, description = '') {
  const url = buildCampaignUrl(slug, 'instagram');
  const tiktokUrl = buildCampaignUrl(slug, 'tiktok');
  return {
    instagram: `${title}\n\n${description?.slice(0, 200) || 'Support this campaign!'}\n\n🔗 ${url}\n\n#CampaignHub #Ghana`,
    tiktok: `${title} — link in bio 👆\n${tiktokUrl}\n#fyp #ghana #campaign`,
  };
}

/** Native mobile share when available */
export async function nativeShare({ title, slug }) {
  if (!navigator.share) return false;
  const url = buildCampaignUrl(slug, 'whatsapp');
  await navigator.share({
    title: title || 'CampaignHub',
    text: getWhatsAppShareText(slug, title),
    url,
  });
  return true;
}
