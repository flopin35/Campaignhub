import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLoading from './AuthLoading';

/**
 * Requires authenticated user with verified email.
 * Unverified users are redirected to /verify-email.
 */
export default function ProtectedVerifiedRoute({ children }) {
  const { user, loading, isVerified } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AuthLoading message="Checking your session…" stage="Securing your session…" />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isVerified) {
    return <Navigate to="/verify-email" state={{ from: location }} replace />;
  }

  return children;
}
