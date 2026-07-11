import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, FileText } from 'lucide-react';
import { PAYMENT_DETAILS } from '../data/packages';
import TrustPaymentBlock from '../components/TrustPaymentBlock';
import { BRAND_COPY } from '../data/brand';

const FAQ = [
  {
    q: 'Is CampaignHub free to use?',
    a: 'Yes. You can launch an official campaign page, upload a banner, share your official link, and use a QR code at no cost. Verification & hosting upgrades are optional.',
  },
  {
    q: 'What does the Official Page badge mean?',
    a: 'Official Page appears only after CampaignHub admin authorizes the campaign page. Paying for Premium requests review — it does not automatically authorize a page.',
  },
  {
    q: 'How do I protect against impersonation?',
    a: 'Request admin authorization for your page. Citizens should look for the Official Page badge. Report fake pages from the campaign page or Support.',
  },
  {
    q: 'How long until my campaign page goes live?',
    a: 'Free pages can go live after launch. Paid or reviewed submissions may wait for admin confirmation of payment — usually within 24 hours on weekdays.',
  },
  {
    q: 'How do payments work?',
    a: `Send Telecel Cash to ${PAYMENT_DETAILS.number} (${PAYMENT_DETAILS.receiver}). Always include your unique CH- reference. Upload a screenshot proof (max 1MB) for admin review.`,
  },
  {
    q: 'What are Verification & Hosting options?',
    a: 'CampaignHub Premium (₵500/month) supports admin authorization review and extended official presence. Directory spotlight and extended hosting are available separately. Authorization badges always require separate admin review.',
  },
  {
    q: 'Can I get a refund?',
    a: `Email ${PAYMENT_DETAILS.supportEmail} with your CH- reference within 48 hours if payment was made in error. Refunds are processed manually after review.`,
  },
];

export default function Support() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white mb-2">Support & Trust</h1>
        <p className="text-gray-400 mb-10">How CampaignHub keeps official campaign pages trustworthy.</p>

        <div className="mb-12">
          <TrustPaymentBlock compact />
        </div>

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            Our policies
          </h2>
          <div className="glass-card p-6 space-y-4 text-sm text-gray-400 leading-relaxed">
            <p>We do not tolerate scam or impersonation pages. Users can report suspicious content — admins review and hide violating pages.</p>
            <p>Payment proofs are stored securely and reviewed only by admin. Payment confirmation is separate from the Official Page badge.</p>
            <p>Authorization badges require separate admin verification — purchasing Premium alone does not authorize a page.</p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-400" />
            FAQ
          </h2>
          <div className="space-y-4">
            {FAQ.map((item) => (
              <div key={item.q} className="glass-card p-5">
                <h3 className="font-medium text-white text-sm mb-2">{item.q}</h3>
                <p className="text-sm text-gray-400">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-10 text-center">
          <Link to="/upload" className="btn-primary">{BRAND_COPY.launchCta}</Link>
        </div>
      </motion.div>
    </div>
  );
}
