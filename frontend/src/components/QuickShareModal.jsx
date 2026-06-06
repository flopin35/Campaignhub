import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import CopyLinkButton from './CopyLinkButton';
import ShareButtons from './ShareButtons';
import { buildCampaignUrl } from '../utils/sharing';
import { X } from './icons/AppIcons';

export default function QuickShareModal({ campaign, onClose }) {
  if (!campaign) return null;
  const url = buildCampaignUrl(campaign.slug, 'qr');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="glass-card w-full max-w-sm space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Share Campaign</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1" aria-label="Close">
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-gray-400 line-clamp-1">{campaign.title}</p>

          <div className="flex justify-center p-3 bg-white rounded-xl">
            <QRCodeSVG value={url} size={140} level="H" />
          </div>

          <CopyLinkButton
            url={buildCampaignUrl(campaign.slug)}
            campaignId={campaign.id}
            label="Copy Link"
            className="w-full"
          />

          <ShareButtons campaign={campaign} compact />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/** Inline trigger buttons for campaign cards */
export function CardShareActions({ campaign, onShareClick }) {
  const [showQr, setShowQr] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-surface-border/50">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onShareClick?.(); }}
          className="flex-1 text-xs py-1.5 px-2 rounded-lg bg-surface-elevated hover:bg-brand-600/20 text-gray-400 hover:text-brand-400 transition-colors"
        >
          Share
        </button>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowQr(!showQr); }}
          className="flex-1 text-xs py-1.5 px-2 rounded-lg bg-surface-elevated hover:bg-brand-600/20 text-gray-400 hover:text-brand-400 transition-colors"
        >
          QR
        </button>
      </div>

      {showQr && (
        <div className="mt-3 p-3 bg-white rounded-xl flex justify-center" onClick={(e) => e.stopPropagation()}>
          <QRCodeSVG value={buildCampaignUrl(campaign.slug, 'qr')} size={100} level="H" />
        </div>
      )}
    </>
  );
}
