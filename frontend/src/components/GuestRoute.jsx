import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLoading from './AuthLoading';

/**
 * Redirect authenticated users away from login/signup.
 * Unverified users go to verify-email instead of dashboard.
 */
export default function GuestRoute({ children }) {
  const { user, loading, isVerified } = useAuth();

  if (loading) {
    return <AuthLoading />;
  }

  if (user) {
    if (!isVerified) {
      return <Navigate to="/verify-email" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
