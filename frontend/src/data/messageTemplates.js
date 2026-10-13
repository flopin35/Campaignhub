/** Broadcast templates. Merge fields: {name} {candidate} {link} {station} {date} */
export const MESSAGE_TEMPLATES = [
  {
    id: 'thanks',
    label: 'Thank you for your support',
    text: 'Hello {name}, thank you for standing with {candidate}. Together we will deliver real change. Share our page with 3 friends: {link}',
  },
  {
    id: 'rally',
    label: 'Rally / event invitation',
    text: 'Hello {name}! {candidate} will be at [VENUE] on [DATE, TIME]. Come with your family and friends — let\'s show our strength. Details: {link}',
  },
  {
    id: 'register',
    label: 'Check the voter register',
    text: 'Hi {name}, the voter register exhibition is on. Please check that your name and photo are correct at your polling station. Every vote counts! — {candidate}',
  },
  {
    id: 'polling',
    label: 'Know your polling station',
    text: 'Hello {name}, your polling station is {station}. Polls open at 7am. Bring your voter ID card and vote early. Thank you! — {candidate}',
  },
  {
    id: 'gotv',
    label: 'Election day — go vote',
    text: 'Good morning {name}! Today is the day. Polls are open 7am–5pm. Please go and vote for {candidate} and bring one person with you. God bless you!',
  },
  {
    id: 'volunteer',
    label: 'Recruit volunteers',
    text: 'Hi {name}, we need 2 hours of your time this Saturday to talk to neighbours about {candidate}\'s plan. Reply YES and we\'ll send details. {link}',
  },
  {
    id: 'fundraise',
    label: 'Fundraising appeal',
    text: 'Dear {name}, campaigns are won with people power. Even ₵10 helps us print flyers and fuel our vans. Support {candidate} here: {link}',
  },
];

export function fillTemplate(text, { name = '', candidate = '', link = '', station = '', date = '' } = {}) {
  return String(text || '')
    .replace(/\{name\}/g, name || 'friend')
    .replace(/\{candidate\}/g, candidate)
    .replace(/\{link\}/g, link)
    .replace(/\{station\}/g, station || 'your polling station')
    .replace(/\{date\}/g, date);
}

/** GSM-7 SMS segment estimate (non-GSM characters force UCS-2 at 70/67 chars). */
export function smsSegments(text = '') {
  // eslint-disable-next-line no-control-regex
  const gsm = /^[\n\r @£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ!"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà^{}\\[~\]|€]*$/.test(text);
  const single = gsm ? 160 : 70;
  const multi = gsm ? 153 : 67;
  if (text.length <= single) return { segments: text.length ? 1 : 0, limit: single, unicode: !gsm };
  return { segments: Math.ceil(text.length / multi), limit: multi, unicode: !gsm };
}
