import { Navigate, useParams } from 'react-router-dom';

/** Deep link → analytics tab in dashboard */
export default function CampaignPerformance() {
  const { slug } = useParams();
  return <Navigate to={`/dashboard?campaign=${slug}&tab=analytics`} replace />;
}
