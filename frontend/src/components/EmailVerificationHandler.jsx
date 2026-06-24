import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { handleEmailVerificationLink } from '../services/authService';
import { hasEmailVerificationLink } from '../utils/authVerification';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AuthLoading from './AuthLoading';

/**
 * On app load / verify-email route: apply Firebase email verification link (oobCode).
 */
export default function EmailVerificationHandler({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(() => hasEmailVerificationLink(location.search));

  useEffect(() => {
    if (!hasEmailVerificationLink(location.search)) return;

    let mounted = true;
    (async () => {
      setProcessing(true);
      try {
        const applied = await handleEmailVerificationLink(location.search);
        if (!mounted) return;
        if (applied) {
          await refreshUser();
          toast('Email verified successfully!', 'success');
          navigate('/dashboard', { replace: true });
        }
      } catch (err) {
        if (mounted) {
          toast(err.message || 'Verification link expired or invalid. Request a new email.', 'error');
          navigate('/verify-email', { replace: true });
        }
      } finally {
        if (mounted) setProcessing(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [location.search, navigate, refreshUser, toast]);

  if (processing) {
    return <AuthLoading message="Confirming your email…" stage="Securing your session…" />;
  }

  return children;
}
