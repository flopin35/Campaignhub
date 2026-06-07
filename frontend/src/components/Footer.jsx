import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { PAYMENT_DETAILS } from '../data/packages';

export default function Footer() {
  return (
    <footer className="border-t border-surface-border bg-surface-card/80 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24 md:pb-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-brand-500 flex items-center justify-center text-white font-bold text-sm shadow-glow-sm">
                CH
              </div>
              <span className="font-bold text-lg text-white">CampaignHub</span>
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
              A trusted campaign operating system for businesses, politicians, creators, and organizations in Ghana.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-4">Platform</h4>
            <div className="space-y-2.5">
              <Link to="/campaigns" className="block text-sm text-gray-500 hover:text-brand-400 transition-colors">
                Explore Campaigns
              </Link>
              <Link to="/upload" className="block text-sm text-gray-500 hover:text-brand-400 transition-colors">
                Launch Free Campaign
              </Link>
              <Link to="/premium" className="block text-sm text-gray-500 hover:text-brand-400 transition-colors">
                Premium Tools
              </Link>
              <Link to="/dashboard" className="block text-sm text-gray-500 hover:text-brand-400 transition-colors">
                Dashboard
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-4">Support & Trust</h4>
            <Link to="/support" className="block text-sm text-gray-500 hover:text-brand-400 transition-colors mb-2">
              Support & FAQ
            </Link>
            <a
              href={`mailto:${PAYMENT_DETAILS.supportEmail}`}
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-400 transition-colors"
            >
              <Mail className="w-4 h-4" />
              {PAYMENT_DETAILS.supportEmail}
            </a>
            <p className="text-xs text-gray-600 mt-3">Mon–Sat, 9am–6pm GMT</p>
            <p className="text-xs text-gray-600 mt-2">{PAYMENT_DETAILS.network} · {PAYMENT_DETAILS.number}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-4">Account</h4>
            <div className="space-y-2.5">
              <Link to="/login" className="block text-sm text-gray-500 hover:text-brand-400 transition-colors">
                Sign In
              </Link>
              <Link to="/signup" className="block text-sm text-gray-500 hover:text-brand-400 transition-colors">
                Create Account
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-surface-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-600">
          <p>© {new Date().getFullYear()} CampaignHub Ghana. All rights reserved.</p>
          <p>Free to start · Telecel Cash payments · Admin verified</p>
        </div>
      </div>
    </footer>
  );
}
