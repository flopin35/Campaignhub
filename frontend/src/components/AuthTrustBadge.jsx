import { Shield, Lock, Zap } from 'lucide-react';

export default function AuthTrustBadge({ compact = false }) {
  if (compact) {
    return (
      <p className="flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
        <Shield className="w-3 h-3 text-emerald-400" />
        Protected by Firebase Security
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 pt-2">
      {[
        { icon: Shield, label: 'Secure', sub: 'Firebase Auth' },
        { icon: Lock, label: 'Encrypted', sub: 'End-to-end' },
        { icon: Zap, label: 'Fast', sub: 'Instant login' },
      ].map(({ icon: Icon, label, sub }) => (
        <div
          key={label}
          className="text-center p-2.5 rounded-xl bg-surface-elevated/50 border border-surface-border/60"
        >
          <Icon className="w-4 h-4 text-brand-400 mx-auto mb-1" />
          <p className="text-[11px] font-medium text-gray-300">{label}</p>
          <p className="text-[10px] text-gray-500">{sub}</p>
        </div>
      ))}
    </div>
  );
}
