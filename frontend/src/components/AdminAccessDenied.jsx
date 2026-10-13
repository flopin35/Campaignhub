import { ShieldAlert } from 'lucide-react';
import { EmptyState, Button } from './ui';

export default function AdminAccessDenied() {
  return (
    <EmptyState
      icon={ShieldAlert}
      title="Admin access only"
      text="This area is restricted to CampaignHub administrators."
      action={<Button to="/dashboard">Back to dashboard</Button>}
    />
  );
}
