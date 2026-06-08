import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminAccessDenied from './AdminAccessDenied';
import AuthLoading from './AuthLoading';

/** Requires authenticated user (verified or not). */
export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AuthLoading message="Checking your session…" stage="Securing your session…" />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <AdminAccessDenied />;
  }

  return children;
}
