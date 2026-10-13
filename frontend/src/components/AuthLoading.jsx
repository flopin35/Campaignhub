import { ShieldCheck } from 'lucide-react';
import BrandMark from './BrandMark';

export default function AuthLoading({ message, stage, showBadge = true }) {
  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4" role="status">
      <div className="text-center animate-fade-up">
        <div className="relative mx-auto w-16 h-16">
          <span className="absolute inset-0 rounded-2xl border-2 border-line border-t-accent animate-spin" />
          <span className="absolute inset-2 flex items-center justify-center"><BrandMark size={40} /></span>
        </div>
        <p className="mt-5 text-sm font-medium text-ink">{message || stage || 'Securing your session…'}</p>
        {showBadge && (
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-ink-3">
            <ShieldCheck className="w-3.5 h-3.5 text-success" /> Secure sign-in
          </p>
        )}
      </div>
    </div>
  );
}
