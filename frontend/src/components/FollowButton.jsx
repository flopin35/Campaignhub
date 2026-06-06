import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { followCampaign, unfollowCampaign, subscribeFollowStatus, subscribeFollowerCount } from '../services/followService';
import { Check, UserPlus } from './icons/AppIcons';

export default function FollowButton({ campaign }) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(campaign.followerCount || 0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!campaign?.id) return;
    const unsubStatus = subscribeFollowStatus(campaign.id, user?.uid, setFollowing);
    const unsubCount = subscribeFollowerCount(campaign.id, setFollowers);
    return () => { unsubStatus(); unsubCount(); };
  }, [campaign?.id, user?.uid]);

  const toggle = async () => {
    if (!isAuthenticated) {
      toast('Sign in to follow campaigns', 'warning');
      return;
    }
    setLoading(true);
    try {
      if (following) {
        await unfollowCampaign(campaign.id, user.uid);
        toast('Unfollowed campaign', 'info');
      } else {
        await followCampaign(campaign.id, user.uid, campaign.title, campaign.ownerId);
        toast('You are now supporting this campaign', 'success');
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggle}
        disabled={loading}
        className={`btn-secondary text-sm py-2 px-4 inline-flex items-center gap-2 ${following ? 'border-brand-500/40 text-brand-400' : ''}`}
      >
        {following ? (
          <>
            <Check className="w-4 h-4" />
            Supporting
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4" />
            Support Campaign
          </>
        )}
      </button>
      <span className="text-sm text-gray-500">{followers.toLocaleString()} supporters</span>
    </div>
  );
}
