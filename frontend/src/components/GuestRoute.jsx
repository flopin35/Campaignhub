import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLoading from './AuthLoading';
import { consumeAuthReturnPath } from '../utils/authRedirect';

export default function GuestRoute({ children }) {
  const { user, loading, isVerified, loadingMessage } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AuthLoading message={loadingMessage} stage="Completing sign-in…" />;
  }

  if (user) {
    if (!isVerified) {
      return <Navigate to="/verify-email" replace />;
    }

    const fromState = location.state?.from?.pathname;
    const returnTo = consumeAuthReturnPath(fromState || '/dashboard');
    return <Navigate to={returnTo} replace />;
  }

  return children;
}
