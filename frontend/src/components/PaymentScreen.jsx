import { useState } from 'react';
import { motion } from 'framer-motion';
import { PAYMENT_DETAILS } from '../data/packages';
import { Shield, Lock, AlertTriangle, Smartphone } from 'lucide-react';

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setCopyError('');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError('Copy failed');
      setTimeout(() => setCopyError(''), 2000);
    }
  };
  return (
    <button type="button" onClick={copy} className="btn-secondary text-xs py-2 px-3 shrink-0 min-h-[40px]">
      {copied ? 'Copied!' : copyError || label || 'Copy'}
    </button>
  );
}

const STEPS = ['Reference generated', 'Send payment', 'Upload proof', 'Awaiting admin review'];

function StepProgress({ step, embedded }) {
  return (
    <div className={embedded ? 'space-y-2' : 'space-y-3'}>
      <div className="flex gap-1.5">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={`h-1.5 rounded-full transition-colors ${i <= step ? 'bg-brand-500' : 'bg-surface-border'}`} />
          </div>
        ))}
      </div>
      <p className="text-[11px] text-gray-500 text-center">
        Step {step + 1} of {STEPS.length} — <span className="text-brand-400">{STEPS[step]}</span>
      </p>
    </div>
  );
}

function DetailRow({ label, value, mono = false, highlight = false, copyText = null, copyLabel = 'Copy' }) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl p-4 gap-3 ${
        highlight
          ? 'bg-brand-600/10 border border-brand-500/30'
          : 'bg-surface-elevated/80 border border-surface-border/60'
      }`}
    >
      <div className="min-w-0">
        <p className={`text-[10px] uppercase tracking-wide mb-0.5 ${highlight ? 'text-brand-400' : 'text-gray-600'}`}>
          {label}
        </p>
        <p className={`${mono ? 'font-mono text-lg sm:text-xl font-bold' : 'text-sm font-medium'} text-white truncate`}>
          {value}
        </p>
      </div>
      {copyText ? <CopyButton text={copyText} label={copyLabel} /> : <Lock className="w-4 h-4 text-gray-600 shrink-0" />}
    </div>
  );
}

export default function PaymentScreen({ pkg, paymentReference, onContinue, step = 2, embedded = false, hideContinue = false }) {
  const content = (
    <>
      <StepProgress step={step} embedded={embedded} />

      {embedded ? (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/8 border border-emerald-500/15">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Send via {PAYMENT_DETAILS.network}</p>
            <p className="text-xs text-gray-500">Use the details below, then upload your screenshot.</p>
          </div>
        </div>
      ) : (
        <div className="glass-card p-4 sm:p-5 border-emerald-500/15 bg-emerald-500/5 flex items-start gap-3">
          <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-emerald-300">Secure payment</p>
            <p className="text-xs text-gray-500 mt-0.5">Admin confirms every payment before features activate. Authorization badges on your official page require separate admin review.</p>
          </div>
        </div>
      )}

      <div className={embedded ? 'space-y-4' : 'glass-card p-5 sm:p-6 space-y-5'}>
        {!embedded && (
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-white">Payment instructions</h2>
            <span className="badge-pending text-[10px] shrink-0">Step {step + 1} of 4</span>
          </div>
        )}

        {embedded && (
          <div className="text-center pb-1">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Amount to send</p>
            <p className="text-3xl font-bold text-brand-400 mt-1">₵{pkg.price}</p>
            <p className="text-sm text-gray-400 mt-1">{pkg.name}</p>
          </div>
        )}

        {!embedded && (
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
        )}

        <div className="space-y-2.5">
          <DetailRow label="Network" value={PAYMENT_DETAILS.network} />
          <DetailRow label="Send to" value={PAYMENT_DETAILS.number} mono copyText={PAYMENT_DETAILS.number} />
          <DetailRow label="Account name" value={PAYMENT_DETAILS.receiver} copyText={PAYMENT_DETAILS.receiver} />
          <DetailRow
            label="Reference (required)"
            value={paymentReference}
            mono
            highlight
            copyText={paymentReference}
            copyLabel="Copy Ref"
          />
        </div>

        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
          <p className="text-amber-400/90 text-xs inline-flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            Include reference <strong className="font-mono">{paymentReference}</strong> in your Telecel Cash message.
          </p>
        </div>

        {!embedded && (
          <p className="text-xs text-gray-500">
            Support:{' '}
            <a href={`mailto:${PAYMENT_DETAILS.supportEmail}`} className="text-brand-400 hover:underline">
              {PAYMENT_DETAILS.supportEmail}
            </a>
          </p>
        )}

        {!hideContinue && onContinue && (
          <button type="button" onClick={onContinue} className="btn-primary w-full py-3.5 min-h-[48px] text-base font-semibold">
            I&apos;ve Sent Payment — Upload Proof
          </button>
        )}
        {hideContinue && (
          <p className="text-xs text-gray-500 text-center">Send payment above, then upload your screenshot below.</p>
        )}
      </div>
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: embedded ? 12 : 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={embedded ? 'space-y-4' : 'space-y-5'}
    >
      {content}
    </motion.div>
  );
}
