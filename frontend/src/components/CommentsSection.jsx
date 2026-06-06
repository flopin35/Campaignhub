import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { subscribeComments, addComment, likeComment } from '../services/commentService';
import ReportButton from './ReportButton';
import { ThumbsUp } from './icons/AppIcons';

function formatTime(ts) {
  if (!ts) return '';
  const d = ts?.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  return d.toLocaleString();
}

export default function CommentsSection({ campaignId }) {
  const { user, userProfile, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!campaignId) return;
    return subscribeComments(campaignId, setComments);
  }, [campaignId]);

  const submit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast('Sign in to comment', 'warning');
      return;
    }
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await addComment({
        campaignId,
        userId: user.uid,
        userName: userProfile?.name || user.displayName || 'User',
        text,
      });
      setText('');
      toast('Comment posted', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (commentId) => {
    try {
      await likeComment(commentId);
    } catch {
      toast('Could not like comment', 'error');
    }
  };

  return (
    <section className="glass-card mt-8 space-y-4">
      <h2 className="text-xl font-bold text-white">Comments & Engagement</h2>
      <p className="text-sm text-gray-500">{comments.length} comments · updated live</p>

      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={isAuthenticated ? 'Share your support...' : 'Sign in to comment'}
          disabled={!isAuthenticated || submitting}
          className="input-field flex-1"
          maxLength={500}
        />
        <button type="submit" disabled={!isAuthenticated || submitting} className="btn-primary text-sm py-2 px-6">
          Post
        </button>
      </form>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-6">Be the first to comment.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="p-4 rounded-xl bg-surface-elevated/60 border border-surface-border/50">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-medium text-white">{c.userName}</span>
                <span className="text-xs text-gray-500">{formatTime(c.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-300">{c.text}</p>
              <div className="flex items-center gap-3 mt-2">
                <button onClick={() => handleLike(c.id)} className="text-xs text-gray-500 hover:text-brand-400">
                  <span className="inline-flex items-center gap-1"><ThumbsUp className="w-3.5 h-3.5" /> {c.likes || 0}</span>
                </button>
                {isAuthenticated && (
                  <ReportButton type="comment" targetId={c.id} campaignId={campaignId} compact />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
