import { Link, useLocation } from 'react-router-dom';
import { cn } from '../utils/format';

const UPDATED = '6 October 2026';
const EMAIL = 'campaignhubgh@gmail.com';

const DOCS = {
  terms: {
    title: 'Terms of service',
    sections: [
      ['Who we are', `CampaignHub ("we", "us") provides online campaign management software and public campaign pages for candidates and campaigns in Ghana. Contact: ${EMAIL}.`],
      ['Your account', 'You must give accurate information, keep your login secure and be at least 18. You are responsible for everything done under your account and through the field links you create.'],
      ['Subscriptions', 'CampaignHub Pro costs GH₵120 per 30 days or GH₵1,200 per 365 days, per campaign page, unless a different price is shown at checkout. Your first campaign page may include a one-time 7-day free trial per account. Paid time starts at the end of any remaining trial or paid period. MoMo payments are prepaid and do not renew automatically; card payments renew automatically only if you turn auto-renew on, and you can turn it off at any time.'],
      ['When a plan ends', 'Pro tools pause when your paid period or trial ends. Your public page stays online for a 3-day grace period, then goes offline until you renew. We keep your data so you can pick up where you left off, and you may export it at any time.'],
      ['Spotlight placements', 'Spotlight is a one-time paid placement on CampaignHub’s homepage and directory for the duration purchased. It does not guarantee any number of views, supporters or votes.'],
      ['Acceptable use', 'You must not use CampaignHub to impersonate any person or campaign; publish false information about voting procedures; incite violence or hatred against any group; harass voters; send messages to people who have not agreed to receive them; or break the laws of Ghana, including electoral and data-protection laws. We may hide pages or suspend accounts that break these rules, without refund where the breach is serious.'],
      ['Voter data', 'You are responsible for having a lawful basis to collect and use the personal data you store in CampaignHub, and for honouring people’s requests to correct or delete their data. We process that data on your behalf and only to provide the service.'],
      ['AI features', 'AI-generated drafts may contain mistakes. Review all content before you publish it. You are responsible for what you publish.'],
      ['Availability & liability', 'We work hard to keep CampaignHub available, especially around elections, but we do not guarantee uninterrupted service. To the extent permitted by law, our total liability is limited to the fees you paid us in the 3 months before the claim. Results collated in CampaignHub are provisional figures entered by your agents and are not official results.'],
      ['Changes', 'We may update these terms. If changes are significant we will notify you by email or in the app before they take effect.'],
    ],
  },
  privacy: {
    title: 'Privacy policy',
    sections: [
      ['What we collect', 'Account details (name, email, phone); campaign content you publish; data you or your supporters enter (supporter names, phone numbers, locations, support levels, donations, results); payment records from Paystack or Flutterwave (we never receive your card number or MoMo PIN); and basic usage data such as page visits by source.'],
      ['How we use it', 'To provide and secure the service, process payments, send service notifications, prevent abuse, and improve CampaignHub. We do not sell personal data and we do not use one campaign’s voter data for another campaign.'],
      ['Who can see campaign data', 'Supporter lists, results and fundraising records are visible only to the campaign owner’s account (and CampaignHub administrators where needed for support or abuse investigation). Public campaign pages are visible to everyone.'],
      ['Facebook & Instagram ads (Meta)', 'If you choose to connect your Meta ad account, we receive an access token for it through Facebook Login. We use it only to show you your own ad campaigns, spend, reach and clicks in your dashboard and to pause or resume campaigns when you ask. The token is stored encrypted on our servers, is never shown in the browser, and is never shared or sold. You can disconnect at any time in Ads → Disconnect, or by removing CampaignHub under Facebook Settings → Business integrations; we then delete the token and all ad data we stored. To request deletion of your Facebook data, use either option or email us.'],
      ['Processors', 'We use Google Firebase (hosting, database, authentication), Vercel (hosting), Paystack and Flutterwave (payments), Meta (only if you connect your ad account), and AI providers (OpenAI / Google) to generate drafts you request. They process data on our instructions.'],
      ['Your rights', `Under Ghana’s Data Protection Act, 2012 (Act 843) you can ask to access, correct or delete your personal data. Supporters who signed up to a campaign should contact that campaign first; you can also email ${EMAIL}.`],
      ['Retention', 'We keep account and campaign data while your account is open. Payment records are kept as long as the law requires. Deleted campaigns are removed from our live database.'],
      ['Security', 'Data is encrypted in transit and protected by access rules that limit each campaign’s data to its owner.'],
    ],
  },
  refunds: {
    title: 'Refund policy',
    sections: [
      ['Free trial first', 'Every account can try Pro free for 7 days before paying, so you can be sure it fits your campaign.'],
      ['Payment problems', `If you were charged twice, charged the wrong amount, or paid but your plan was not activated, email ${EMAIL} with your payment reference within 14 days. We will activate your plan or refund the duplicate/incorrect amount to the original payment method.`],
      ['Subscriptions', 'Monthly and yearly plans are prepaid. After a paid period starts we do not refund unused days, but you can stop renewing at any time and keep access until the period ends.'],
      ['Spotlight', 'Spotlight placements are refundable only if we fail to deliver the placement.'],
      ['How refunds are paid', 'Refunds go back through Paystack or Flutterwave to your original MoMo wallet or card. Timing depends on your provider, typically 3–10 working days.'],
    ],
  },
};

export default function Legal() {
  const { pathname } = useLocation();
  const key = pathname.replace('/', '') in DOCS ? pathname.replace('/', '') : 'terms';
  const docData = DOCS[key];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 grid md:grid-cols-[200px_1fr] gap-10">
      <nav className="md:sticky md:top-24 h-fit flex md:flex-col gap-1" aria-label="Legal">
        {Object.entries(DOCS).map(([k, d]) => (
          <Link key={k} to={`/${k}`} className={cn('nav-item', k === key && 'nav-item-active')}>{d.title}</Link>
        ))}
      </nav>
      <article className="max-w-3xl">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink">{docData.title}</h1>
        <p className="text-sm text-ink-3 mt-2">Last updated {UPDATED}</p>
        <div className="mt-10 space-y-8">
          {docData.sections.map(([h, body], i) => (
            <section key={h}>
              <h2 className="text-lg font-bold text-ink">{i + 1}. {h}</h2>
              <p className="mt-2 text-[15px] text-ink-2 leading-relaxed">{body}</p>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
