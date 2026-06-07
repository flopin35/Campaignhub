import { Shield, Lock, Clock, CheckCircle2, Mail, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PAYMENT_DETAILS } from '../data/packages';

export default function TrustPaymentBlock({ compact = false }) {
  const steps = [
    { icon: CheckCircle2, label: 'Select package' },
    { icon: Lock, label: 'Unique CH- reference' },
    { icon: Phone, label: 'Telecel Cash payment' },
    { icon: Shield, label: 'Upload proof' },
    { icon: Clock, label: 'Pending review' },
  ];

  return (
    <div className={`trust-block ${compact ? 'p-5 sm:p-6' : 'p-6 sm:p-8'}`}>
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="font-semibold text-white text-base">Secure payment process</h3>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            Manual verification protects you and the platform. Every payment is reviewed before activation.
          </p>
        </div>
      </div>

      {!compact && (
        <div className="flex flex-wrap gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={s.label} className="flex items-center gap-1.5 text-xs text-gray-500 bg-surface-elevated px-3 py-1.5 rounded-lg border border-surface-border">
              <s.icon className="w-3.5 h-3.5 text-brand-400" />
              <span>{i + 1}. {s.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3 mb-5">
        <div className="bg-surface-elevated/80 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wide text-gray-600 mb-1">Network</p>
          <p className="text-sm font-medium text-white">{PAYMENT_DETAILS.network}</p>
        </div>
        <div className="bg-surface-elevated/80 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wide text-gray-600 mb-1">Number</p>
          <p className="text-sm font-mono font-medium text-white">{PAYMENT_DETAILS.number}</p>
        </div>
        <div className="bg-surface-elevated/80 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wide text-gray-600 mb-1">Account name</p>
          <p className="text-sm font-medium text-white">{PAYMENT_DETAILS.receiver}</p>
        </div>
        <div className="bg-surface-elevated/80 rounded-xl p-4">
          <p className="text-[10px] uppercase tracking-wide text-gray-600 mb-1">Support</p>
          <a href={`mailto:${PAYMENT_DETAILS.supportEmail}`} className="text-sm text-brand-400 hover:underline break-all">
            {PAYMENT_DETAILS.supportEmail}
          </a>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <a href={`mailto:${PAYMENT_DETAILS.supportEmail}`} className="btn-secondary text-sm inline-flex items-center gap-2 min-h-[44px]">
          <Mail className="w-4 h-4" />
          Contact support
        </a>
        <Link to="/support" className="btn-secondary text-sm min-h-[44px] inline-flex items-center">
          FAQ & refund help
        </Link>
      </div>
    </div>
  );
}
