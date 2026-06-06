import { useState } from 'react';
import { motion } from 'framer-motion';
import { PAYMENT_DETAILS } from '../data/packages';
import { AlertTriangle } from './icons/AppIcons';

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="btn-secondary text-xs py-1.5 px-3 shrink-0">
      {copied ? 'Copied!' : label || 'Copy'}
    </button>
  );
}

export default function PaymentScreen({ pkg, paymentReference, onContinue }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="glass-card p-6 border-amber-500/20 bg-amber-500/5">
        <p className="text-amber-400 text-sm font-medium inline-flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Use the exact reference shown below for fast verification.
        </p>
      </div>

      <div className="glass-card p-6 space-y-5">
        <h2 className="text-xl font-bold text-white">Complete Payment</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-surface-elevated/80 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Package</p>
            <p className="text-white font-medium">{pkg.name}</p>
          </div>
          <div className="bg-surface-elevated/80 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Amount</p>
            <p className="text-brand-400 font-bold text-lg">{pkg.price} GHS</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between bg-surface-elevated/80 rounded-xl p-4 gap-3">
            <div>
              <p className="text-xs text-gray-500">Send to (Mobile Money)</p>
              <p className="text-white font-mono text-lg">{PAYMENT_DETAILS.number}</p>
            </div>
            <CopyButton text={PAYMENT_DETAILS.number} label="Copy" />
          </div>

          <div className="flex items-center justify-between bg-surface-elevated/80 rounded-xl p-4 gap-3">
            <div>
              <p className="text-xs text-gray-500">Receiver Name</p>
              <p className="text-white font-medium">{PAYMENT_DETAILS.receiver}</p>
            </div>
            <CopyButton text={PAYMENT_DETAILS.receiver} label="Copy" />
          </div>

          <div className="flex items-center justify-between bg-brand-600/10 border border-brand-500/30 rounded-xl p-4 gap-3">
            <div>
              <p className="text-xs text-brand-400">Payment Reference (required)</p>
              <p className="text-white font-mono text-xl font-bold">{paymentReference}</p>
            </div>
            <CopyButton text={paymentReference} label="Copy Ref" />
          </div>
        </div>

        <p className="text-sm text-gray-500">
          After sending payment, click below to upload your screenshot proof.
        </p>

        <button onClick={onContinue} className="btn-primary w-full py-3">
          I've Sent Payment — Upload Proof
        </button>
      </div>
    </motion.div>
  );
}
