import { Navigate, useParams, useSearchParams } from 'react-router-dom';

/** Deep link → unified dashboard workspace */
export default function CampaignCommandCenter() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'overview';
  return <Navigate to={`/dashboard?campaign=${slug}&tab=${tab}`} replace />;
}
