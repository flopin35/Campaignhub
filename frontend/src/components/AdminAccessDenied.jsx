import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { ADMIN_EMAIL } from '../firebase/auth';
import { Lock } from './icons/AppIcons';

export default function AdminAccessDenied() {
  const { user } = useAuth();

  return (
    <div className="max-w-lg mx-auto px-4 py-20">
      <div className="card text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 flex items-center justify-center">
          <Lock className="w-7 h-7 text-amber-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Admin Access Restricted</h1>
        <p className="text-gray-400 text-sm mb-4">
          The admin dashboard is only available to:
        </p>
        <p className="text-brand-400 font-medium mb-6">{ADMIN_EMAIL}</p>
        <p className="text-gray-500 text-sm mb-6">
          You're signed in as <strong className="text-gray-300">{user?.email}</strong>
        </p>
        <Link to="/dashboard" className="btn-primary text-sm">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
