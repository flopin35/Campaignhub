/**
 * Public campaign page CTAs — not currently mounted.
 * If wired into CampaignDetails, keep scope to presence features only (updates sign-up, MoMo donate).
 */
import { useState } from 'react';
import { Users, Wallet } from 'lucide-react';
import SupporterSignupModal from './SupporterSignupModal';
import DonateModal from './DonateModal';

import { trackClick } from '../services/analyticsService';

export default function CampaignMobilization({ campaign }) {
  const [modal, setModal] = useState(null);

  const open = (type) => {
    trackClick(campaign.id).catch(console.error);
    setModal(type);
  };

  return (
    <>
      <section className="glass-card border-brand-500/15 mb-8">
        <p className="text-xs text-brand-400 uppercase tracking-wide mb-1">Stay informed</p>
        <h3 className="text-lg font-semibold text-white mb-2">Support this campaign page</h3>
        <p className="text-sm text-gray-500 mb-5">
          Sign up for official updates or donate via Mobile Money — tied to this authorized campaign page.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => open('supporter')}
            className="flex items-center sm:flex-col gap-3 sm:gap-2 p-4 min-h-[56px] rounded-xl bg-surface-elevated border border-surface-border hover:border-brand-500/40 transition-colors touch-manipulation text-left sm:text-center"
          >
            <Users className="w-6 h-6 text-brand-400 shrink-0" />
            <div className="sm:contents">
              <span className="text-sm font-medium text-white block">Get campaign updates</span>
              <span className="text-[10px] text-gray-500 block sm:mt-0">News & official announcements</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => open('donate')}
            className="flex items-center sm:flex-col gap-3 sm:gap-2 p-4 min-h-[56px] rounded-xl bg-surface-elevated border border-emerald-500/20 hover:border-emerald-500/40 transition-colors touch-manipulation text-left sm:text-center"
          >
            <Wallet className="w-6 h-6 text-emerald-400 shrink-0" />
            <div className="sm:contents">
              <span className="text-sm font-medium text-white block">Donate (MoMo)</span>
              <span className="text-[10px] text-gray-500 block">Telecel Cash · from ₵5</span>
            </div>
          </button>
        </div>
      </section>

      {modal === 'supporter' && (
        <SupporterSignupModal campaign={campaign} onClose={() => setModal(null)} />
      )}
      {modal === 'donate' && (
        <DonateModal campaign={campaign} onClose={() => setModal(null)} />
      )}
    </>
  );
}
