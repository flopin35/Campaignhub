import { useSearchParams, Link } from 'react-router-dom';
import { Mail, Flag, ShieldCheck, LifeBuoy, Receipt } from 'lucide-react';
import { Card, Disclosure, Button, Alert } from '../components/ui';

const SUPPORT_EMAIL = 'campaignhubgh@gmail.com';

const FAQ = [
  ['I paid but my plan is not active', 'Payments through Paystack and Flutterwave activate automatically, usually within seconds. MoMo can take a minute if you approved the prompt late. If it has been more than 15 minutes, email us your payment reference (it starts with CH-PRO or CH-SPT) and the campaign name.'],
  ['How do I cancel?', 'MoMo payments are prepaid — simply don’t renew. If you turned on card auto-renew, open Plan & billing in your campaign and choose “Turn off auto-renew”. Pro stays active until the end of the period you paid for.'],
  ['Can you import my existing voter list?', 'Yes. Use Voters → Import with a CSV saved from Excel or Google Sheets. If your list is messy or very large, email it to us and we will help.'],
  ['Someone created a fake page in my name', 'Report it below with the link to the fake page. We review reports quickly, can hide impersonation pages, and verify genuine campaigns with a blue badge.'],
  ['How do I disconnect Facebook ads?', 'Open your campaign → Ads → the ••• menu on the Facebook & Instagram card → Disconnect. You can also remove CampaignHub in Facebook under Settings → Business integrations; we then delete the connection automatically.'],
  ['Who can see my voters and results?', 'Only you (the campaign owner). Field and polling-agent links can add entries but cannot read your data. You can export or delete your data at any time.'],
  ['Do you support every party?', 'Yes. CampaignHub is non-partisan. We serve candidates from every party and independents.'],
];

export default function Support() {
  const [params] = useSearchParams();
  const reported = params.get('report');
  const metaDeletion = (params.get('meta-deletion') || '').replace(/[^A-Z0-9-]/gi, '').slice(0, 40);
  const reportMail = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Report: ${reported || 'campaign page'}`)}&body=${encodeURIComponent(`Page: ${reported ? `${window.location.origin}/campaign/${reported}` : ''}\n\nWhat is wrong with this page?\n`)}`;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <p className="eyebrow">Support</p>
      <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold text-ink">How can we help?</h1>
      <p className="mt-3 text-lg text-ink-2 max-w-2xl">Real people in Ghana reply to every message — usually the same day.</p>

      {metaDeletion && (
        <Alert className="mt-8" tone="success" icon={ShieldCheck} title="Facebook data deletion complete">
          Request {metaDeletion}: CampaignHub has deleted the Facebook connection and every piece of ad-account data it held for you.
          Keep this code if you need to contact us about it.
        </Alert>
      )}

      {reported && (
        <Alert className="mt-8" tone="warning" icon={Flag} title={`Report /campaign/${reported}`} action={<Button size="sm" href={reportMail}>Send report</Button>}>
          Tell us what is wrong (impersonation, false information, hate or incitement). We review every report.
        </Alert>
      )}

      <div className="mt-10 grid md:grid-cols-3 gap-4">
        <Card>
          <Mail className="w-6 h-6 text-ink-2" />
          <h2 className="mt-4 font-bold text-ink">Email us</h2>
          <p className="text-sm text-ink-2 mt-1">Billing, setup help, data imports.</p>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="mt-4 inline-block text-link font-medium break-all">{SUPPORT_EMAIL}</a>
        </Card>
        <Card>
          <Receipt className="w-6 h-6 text-ink-2" />
          <h2 className="mt-4 font-bold text-ink">Payment issue</h2>
          <p className="text-sm text-ink-2 mt-1">Include your CH- reference and campaign name.</p>
          <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Payment issue')}`} className="mt-4 inline-block text-link font-medium">Report a payment →</a>
        </Card>
        <Card>
          <Flag className="w-6 h-6 text-ink-2" />
          <h2 className="mt-4 font-bold text-ink">Report a page</h2>
          <p className="text-sm text-ink-2 mt-1">Impersonation, misinformation or abuse.</p>
          <a href={reportMail} className="mt-4 inline-block text-link font-medium">Send a report →</a>
        </Card>
      </div>

      <section className="mt-16 grid lg:grid-cols-[1fr_1.4fr] gap-10">
        <div>
          <LifeBuoy className="w-7 h-7 text-ink-2" />
          <h2 className="mt-4 text-2xl font-extrabold text-ink">Common questions</h2>
          <p className="mt-2 text-ink-2">Can&apos;t find what you need? Email us.</p>
          <div className="mt-6 rounded-xl bg-surface-2 border border-line p-5 text-sm text-ink-2">
            <p className="font-semibold text-ink flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-success" /> Our standards</p>
            <p className="mt-2">We don&apos;t allow impersonation, incitement, hate speech or false information about voting. Pages that break these rules are hidden. Read our <Link to="/terms" className="text-link">terms</Link>.</p>
          </div>
        </div>
        <div className="border-t border-line">
          {FAQ.map(([q, a]) => <Disclosure key={q} title={q}>{a}</Disclosure>)}
        </div>
      </section>
    </div>
  );
}
