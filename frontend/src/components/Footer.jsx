import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { PAYMENT_DETAILS } from '../data/packages';
import { BRAND, BRAND_COPY } from '../data/brand';
import BrandMark from './BrandMark';

export default function Footer() {
  return (
    <footer className="border-t border-surface-border bg-surface-card/80 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-24 md:pb-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4 group">
              <BrandMark size={36} />
              <span className="font-bold text-lg text-white tracking-tight">{BRAND.name}</span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
              {BRAND.shortTagline} {BRAND.tagline} Built for candidates, parties, and citizens in {BRAND.country}.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-4">Explore</h4>
            <div className="space-y-2.5">
              <Link to="/campaigns" className="block text-sm text-gray-400 hover:text-brand-400 transition-colors">
                {BRAND_COPY.directory}
              </Link>
              <Link to="/upload" className="block text-sm text-gray-400 hover:text-brand-400 transition-colors">
                {BRAND_COPY.launchCta}
              </Link>
              <Link to="/premium" className="block text-sm text-gray-400 hover:text-brand-400 transition-colors">
                {BRAND_COPY.hostingNav}
              </Link>
              <Link to="/dashboard" className="block text-sm text-gray-400 hover:text-brand-400 transition-colors">
                {BRAND_COPY.myPages}
              </Link>
              <Link to="/about" className="block text-sm text-gray-400 hover:text-brand-400 transition-colors">
                About CampaignHub
              </Link>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-4">Support & Trust</h4>
            <Link to="/support" className="block text-sm text-gray-400 hover:text-brand-400 transition-colors mb-2">
              Support & FAQ
            </Link>
            <a
              href={`mailto:${PAYMENT_DETAILS.supportEmail}`}
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-brand-400 transition-colors"
            >
              <Mail className="w-4 h-4" aria-hidden />
              {PAYMENT_DETAILS.supportEmail}
            </a>
            <p className="text-xs text-gray-400 mt-3">Mon–Sat, 9am–6pm GMT</p>
            <p className="text-xs text-gray-400 mt-2">{PAYMENT_DETAILS.network} · {PAYMENT_DETAILS.number}</p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-4">Account</h4>
            <div className="space-y-2.5">
              <Link to="/login" className="block text-sm text-gray-400 hover:text-brand-400 transition-colors">
                Sign In
              </Link>
              <Link to="/signup" className="block text-sm text-gray-400 hover:text-brand-400 transition-colors">
                Create account
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-surface-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-600">
          <p className="text-gray-400">© {new Date().getFullYear()} {BRAND.name} {BRAND.country}. All rights reserved.</p>
          <p className="text-gray-400">Official campaign pages · Admin authorization available · Pages may be hidden, archived, or retained</p>
        </div>
      </div>
    </footer>
  );
}
