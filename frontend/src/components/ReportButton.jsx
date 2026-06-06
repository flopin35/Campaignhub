import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { reportCampaign, reportComment } from '../services/reportService';
import { Flag } from './icons/AppIcons';

const REASONS = ['Spam', 'Misleading content', 'Inappropriate', 'Scam', 'Other'];

export default function ReportButton({ type = 'campaign', targetId, campaignId, compact = false }) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!isAuthenticated) {
      toast('Sign in to report', 'warning');
      return;
    }
    setLoading(true);
    try {
      if (type === 'comment') {
        await reportComment({ commentId: targetId, campaignId, reporterId: user.uid, reason, details });
      } else {
        await reportCampaign({ campaignId: targetId, reporterId: user.uid, reason, details });
      }
      toast('Report submitted — thank you', 'success');
      setOpen(false);
      setDetails('');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => (isAuthenticated ? setOpen(true) : toast('Sign in to report', 'warning'))}
        className={`text-xs text-gray-500 hover:text-red-400 transition-colors inline-flex items-center gap-1.5 ${compact ? '' : 'btn-secondary py-2 px-3'}`}
      >
        <Flag className="w-3.5 h-3.5" />
        Report
      </button>
    );
  }

  return (
    <div className={`${compact ? 'mt-1' : 'glass-card p-4 space-y-3'}`}>
      {!compact && <p className="text-sm text-gray-400">Report this {type}</p>}
      <select value={reason} onChange={(e) => setReason(e.target.value)} className="input-field text-sm">
        {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <input
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="Additional details (optional)"
        className="input-field text-sm"
      />
      <div className="flex gap-2">
        <button onClick={submit} disabled={loading} className="btn-primary text-xs py-1.5 px-3">Submit</button>
        <button onClick={() => setOpen(false)} className="btn-secondary text-xs py-1.5 px-3">Cancel</button>
      </div>
    </div>
  );
}
