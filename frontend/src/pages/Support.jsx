import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, FileText } from 'lucide-react';
import { PAYMENT_DETAILS } from '../data/packages';
import TrustPaymentBlock from '../components/TrustPaymentBlock';
import { BRAND_COPY } from '../data/brand';

const FAQ = [
  {
    q: 'Is CampaignHub free to use?',
    a: 'Yes. You can launch campaign pages, upload banners, share official links, use QR codes, and access basic page analytics for free. Verification and hosting upgrades are optional.',
  },
  {
    q: 'How do payments work?',
    a: `Send Telecel Cash to ${PAYMENT_DETAILS.number} (${PAYMENT_DETAILS.receiver}). Always include your unique CH- reference. Upload a screenshot proof (max 1MB) for admin review.`,
  },
  {
    q: 'How long until my campaign page goes live?',
    a: 'Free and paid submissions enter a review queue. Admin verifies payment proof and approves campaign pages — usually within 24 hours on weekdays.',
  },
  {
    q: 'What if my payment is rejected?',
    a: 'You will receive a notification with the reason. Contact support with your reference code and we will help resolve it.',
  },
  {
    q: 'What verification and hosting options are available?',
    a: 'CampaignHub Premium: ₵500/month (admin verification badge, AI message support, page analytics, sharing formats). Ad Boost: ₵20 (3hrs) · ₵50 (6hrs) · ₵100 (12hrs) · ₵200 (24hrs) · ₵350 (48hrs). Extended hosting: ₵500.',
  },
  {
    q: 'Can I get a refund?',
    a: `Email ${PAYMENT_DETAILS.supportEmail} with your CH- reference within 48 hours if payment was made in error. Refunds are processed manually after review.`,
  },
  {
    q: 'Are analytics real?',
    a: 'Yes. Page views, shares, QR scans, and link copies are tracked live from Firebase — never fake or hardcoded.',
  },
];

export default function Support() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white mb-2">Support & Trust</h1>
        <p className="text-gray-400 mb-10">CampaignHub is built for trust — here is how we operate.</p>

        <div className="mb-12">
          <TrustPaymentBlock compact />
        </div>

        <section className="mb-12">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            Our policies
          </h2>
          <div className="glass-card p-6 space-y-4 text-sm text-gray-400 leading-relaxed">
            <p>All campaign pages require admin approval before going public. We verify payment references manually to prevent fraud.</p>
            <p>We do not tolerate scam or impersonation pages. Users can report suspicious content — admins review and disable violating pages.</p>
            <p>Payment proofs are stored securely in Firebase Storage under payments/screenshots/ and reviewed only by admin.</p>
            <p>Premium features activate only after payment confirmation — authorization badges require separate admin verification.</p>
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
