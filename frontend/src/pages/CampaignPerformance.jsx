import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useParams, Navigate } from 'react-router-dom';
import { useCampaign } from '../hooks/useCampaigns';
import { useAuth } from '../context/AuthContext';
import CampaignSkeleton from '../components/CampaignSkeleton';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import ShareCampaignSection from '../components/ShareCampaignSection';

export default function CampaignPerformance() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { campaign, loading, error } = useCampaign(slug);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20">
        <CampaignSkeleton count={1} />
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-white">Campaign not found</h2>
        <Link to="/dashboard" className="btn-primary mt-4 inline-block">Back to Dashboard</Link>
      </div>
    );
  }

  const isOwner = user?.uid === campaign.ownerId;

  if (!isOwner && campaign.status !== 'active') {
    return <Navigate to={`/campaign/${slug}`} replace />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-xs text-brand-400 uppercase tracking-wide mb-1">Campaign Performance</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{campaign.title}</h1>
            <p className="text-sm text-gray-500 mt-1">Growth · traffic · engagement metrics</p>
          </div>
          <div className="flex gap-2">
            <Link to={`/campaign/${slug}`} className="btn-secondary text-sm">View Campaign</Link>
            {isOwner && <Link to="/dashboard" className="btn-secondary text-sm">Dashboard</Link>}
          </div>
        </div>

        <AnalyticsDashboard campaign={campaign} />

        {campaign.status === 'active' && (
          <div className="mt-8">
            <ShareCampaignSection campaign={campaign} />
          </div>
        )}
      </motion.div>
    </div>
  );
}
