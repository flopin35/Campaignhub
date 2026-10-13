import { Compass } from 'lucide-react';
import { EmptyState, Button } from '../components/ui';

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 py-24">
      <EmptyState
        icon={Compass}
        title="Page not found"
        text="The page you're looking for doesn't exist or has moved."
        action={
          <>
            <Button to="/">Go home</Button>
            <Button variant="secondary" to="/campaigns">Browse campaigns</Button>
          </>
        }
      />
    </div>
  );
}
