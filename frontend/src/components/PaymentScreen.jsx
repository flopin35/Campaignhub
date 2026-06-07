import { useState } from 'react';
import { motion } from 'framer-motion';
import { PAYMENT_DETAILS } from '../data/packages';
import { Shield, Lock, AlertTriangle } from 'lucide-react';

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button type="button" onClick={copy} className="btn-secondary text-xs py-2 px-3 shrink-0 min-h-[40px]">
      {copied ? 'Copied!' : label || 'Copy'}
    </button>
  );
}

const STEPS = ['Reference generated', 'Send payment', 'Upload proof', 'Pending review'];

export default function PaymentScreen({ pkg, paymentReference, onContinue, step = 2 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-5">
      {/* Progress */}
      <div className="flex gap-1">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={`h-1 rounded-full ${i <= step ? 'bg-brand-500' : 'bg-surface-border'}`} />
            <p className={`text-[9px] mt-1 hidden sm:block ${i <= step ? 'text-brand-400' : 'text-gray-600'}`}>{s}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-4 sm:p-5 border-emerald-500/15 bg-emerald-500/5 flex items-start gap-3">
        <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-emerald-300">Secure payment</p>
          <p className="text-xs text-gray-500 mt-0.5">Admin verifies every payment before activation. Your reference is unique and tied to your account.</p>
        </div>
      </div>

      <div className="glass-card p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white">Payment instructions</h2>
          <span className="badge-pending text-[10px] shrink-0">Step {step + 1} of 4</span>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="bg-surface-elevated/80 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-wide text-gray-600 mb-1">Package</p>
            <p className="text-sm text-white font-medium">{pkg.name}</p>
          </div>
          <div className="bg-surface-elevated/80 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-wide text-gray-600 mb-1">Amount</p>
            <p className="text-brand-400 font-bold text-lg">₵{pkg.price}</p>
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between bg-surface-elevated/80 rounded-xl p-4 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-600">Network</p>
              <p className="text-sm text-white font-medium">{PAYMENT_DETAILS.network}</p>
            </div>
            <Lock className="w-4 h-4 text-gray-600 shrink-0" />
          </div>

          <div className="flex items-center justify-between bg-surface-elevated/80 rounded-xl p-4 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-600">Send to</p>
              <p className="text-white font-mono text-base sm:text-lg">{PAYMENT_DETAILS.number}</p>
            </div>
            <CopyButton text={PAYMENT_DETAILS.number} label="Copy" />
          </div>

          <div className="flex items-center justify-between bg-surface-elevated/80 rounded-xl p-4 gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide text-gray-600">Account name</p>
              <p className="text-sm text-white font-medium">{PAYMENT_DETAILS.receiver}</p>
            </div>
            <CopyButton text={PAYMENT_DETAILS.receiver} label="Copy" />
          </div>

          <div className="flex items-center justify-between bg-brand-600/10 border border-brand-500/30 rounded-xl p-4 gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-brand-400">Reference (required)</p>
              <p className="text-white font-mono text-lg sm:text-xl font-bold truncate">{paymentReference}</p>
            </div>
            <CopyButton text={paymentReference} label="Copy Ref" />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
          <p className="text-amber-400/90 text-xs inline-flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            Include reference <strong className="font-mono">{paymentReference}</strong> in your Telecel Cash message.
          </p>
        </div>

        <p className="text-xs text-gray-500">
          Support:{' '}
          <a href={`mailto:${PAYMENT_DETAILS.supportEmail}`} className="text-brand-400 hover:underline">
            {PAYMENT_DETAILS.supportEmail}
          </a>
        </p>

        <button type="button" onClick={onContinue} className="btn-primary w-full py-3.5 min-h-[48px]">
          I've Sent Payment — Upload Proof
        </button>
      </div>
    </motion.div>
  );
}
