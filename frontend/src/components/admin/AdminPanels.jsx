import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { verifyCampaign, verifyUser, getAllUsers } from '../../services/verificationService';
import { subscribeReports, resolveReport } from '../../services/reportService';
import { subscribeAllComments, hideComment, deleteComment } from '../../services/commentService';
import { approveExtension } from '../../services/extensionService';

export function AdminVerificationPanel({ campaigns }) {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(null);

  useEffect(() => {
    getAllUsers().then(setUsers).catch(console.error);
  }, []);

  const toggleCampaign = async (c) => {
    setLoading(c.id);
    try {
      await verifyCampaign(c.id, !c.verified, c.ownerId, c.title);
      toast(c.verified ? 'Verification revoked' : 'Campaign verified', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(null);
    }
  };

  const toggleUser = async (u) => {
    setLoading(u.id);
    try {
      await verifyUser(u.id, !u.verified);
      toast(u.verified ? 'User verification revoked' : 'User verified', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(null);
    }
  };

  const active = campaigns.filter((c) => c.status === 'active');

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Verify Campaigns</h2>
        <div className="space-y-3">
          {active.map((c) => (
            <div key={c.id} className="glass-card p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-white font-medium">{c.title}</p>
                <p className="text-xs text-gray-500">{c.ownerName} · {c.verified ? 'Verified' : 'Not verified'}</p>
              </div>
              <button
                onClick={() => toggleCampaign(c)}
                disabled={loading === c.id}
                className={`text-xs py-2 px-4 rounded-xl border ${
                  c.verified ? 'border-red-500/30 text-red-400' : 'border-blue-500/30 text-blue-400'
                }`}
              >
                {c.verified ? 'Revoke' : 'Verify'}
              </button>
            </div>
          ))}
          {active.length === 0 && <p className="text-gray-500 text-sm">No active campaigns.</p>}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Verify Users</h2>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {users.map((u) => (
            <div key={u.id} className="glass-card p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-white font-medium">{u.name || u.email}</p>
                <p className="text-xs text-gray-500">{u.email} · {u.verified ? 'Verified' : 'Not verified'}</p>
              </div>
              <button
                onClick={() => toggleUser(u)}
                disabled={loading === u.id}
                className={`text-xs py-2 px-4 rounded-xl border ${
                  u.verified ? 'border-red-500/30 text-red-400' : 'border-blue-500/30 text-blue-400'
                }`}
              >
                {u.verified ? 'Revoke' : 'Verify'}
              </button>
            </div>
          ))}
          {users.length === 0 && <p className="text-gray-500 text-sm">No users found.</p>}
        </div>
      </section>
    </div>
  );
}

export function AdminReportsPanel() {
  const { toast } = useToast();
  const [reports, setReports] = useState([]);

  useEffect(() => subscribeReports(setReports), []);

  const resolve = async (id, action) => {
    try {
      await resolveReport(id, action);
      toast(`Report ${action}`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white mb-4">Pending Reports</h2>
      {reports.length === 0 ? (
        <p className="text-gray-500 text-sm">No pending reports.</p>
      ) : (
        reports.map((r) => (
          <div key={r.id} className="glass-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="badge-pending text-[10px]">{r.type}</span>
              <span className="text-sm text-white">{r.reason}</span>
            </div>
            {r.details && <p className="text-xs text-gray-400">{r.details}</p>}
            <div className="flex gap-2">
              <button onClick={() => resolve(r.id, 'resolved')} className="btn-primary text-xs py-1.5 px-3">Resolve</button>
              <button onClick={() => resolve(r.id, 'dismissed')} className="btn-secondary text-xs py-1.5 px-3">Dismiss</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export function AdminCommentsPanel() {
  const { toast } = useToast();
  const [comments, setComments] = useState([]);

  useEffect(() => subscribeAllComments(setComments), []);

  const hide = async (id, campaignId) => {
    try {
      await hideComment(id);
      toast('Comment hidden', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const remove = async (id, campaignId) => {
    try {
      await deleteComment(id, campaignId);
      toast('Comment deleted', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white mb-4">Moderate Comments</h2>
      {comments.slice(0, 20).map((c) => (
        <div key={c.id} className="glass-card p-4">
          <p className="text-sm text-white">{c.userName}</p>
          <p className="text-sm text-gray-400 mt-1">{c.text}</p>
          <div className="flex gap-2 mt-2">
            <button onClick={() => hide(c.id, c.campaignId)} className="btn-secondary text-xs py-1 px-3">Hide</button>
            <button onClick={() => remove(c.id, c.campaignId)} className="text-xs py-1 px-3 text-red-400">Delete</button>
          </div>
        </div>
      ))}
      {comments.length === 0 && <p className="text-gray-500 text-sm">No comments.</p>}
    </div>
  );
}

export async function handleExtensionApproval({ payment, campaign, toast }) {
  await approveExtension({
    paymentId: payment.id,
    campaignId: campaign.id,
    campaign,
    extensionDays: payment.extensionDays || 7,
    ownerId: campaign.ownerId,
    title: campaign.title,
  });
  toast(`Extension approved for "${campaign.title}"`, 'success');
}
