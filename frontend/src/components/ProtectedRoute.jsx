import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminAccessDenied from './AdminAccessDenied';
import VerifyEmailNotice from './VerifyEmailNotice';

export default function ProtectedRoute({
  children,
  requireVerified = false,
  requireAdmin = false,
}) {
  const { user, loading, isAdmin, isVerified } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <AdminAccessDenied />;
  }

  if (requireVerified && !isVerified) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-bold text-white mb-2">Email verification required</h1>
        <p className="text-gray-400 text-sm mb-6">
          Verify your email before uploading campaigns.
        </p>
        <VerifyEmailNotice />
      </div>
    );
  }

  return children;
}
