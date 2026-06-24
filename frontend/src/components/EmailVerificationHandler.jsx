import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  completeEmailLinkSignIn,
  handleEmailVerificationLink,
  isUserVerified,
} from '../services/authService';
import {
  hasEmailSignInLink,
  hasEmailVerificationLink,
  resolvePostLoginPath,
} from '../utils/authVerification';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AuthLoading from './AuthLoading';

/**
 * On app load: apply Firebase email verification or passwordless sign-in links.
 */
export default function EmailVerificationHandler({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(
    () => hasEmailVerificationLink(location.search) || hasEmailSignInLink(location.search)
  );

  useEffect(() => {
    const isVerify = hasEmailVerificationLink(location.search);
    const isSignIn = hasEmailSignInLink(location.search);
    if (!isVerify && !isSignIn) return;

    let mounted = true;
    (async () => {
      setProcessing(true);
      try {
        if (isSignIn) {
          const result = await completeEmailLinkSignIn(window.location.href);
          if (!mounted || !result) return;
          await refreshUser();
          const verified = isUserVerified(result.user, result.profile);
          toast(verified ? 'Signed in successfully!' : 'Signed in — verify your email to continue.', verified ? 'success' : 'warning');
          navigate(resolvePostLoginPath(verified, '/dashboard'), { replace: true });
          return;
        }

        const applied = await handleEmailVerificationLink(location.search);
        if (!mounted) return;
        if (applied) {
          await refreshUser();
          toast('Email verified successfully!', 'success');
          navigate('/dashboard', { replace: true });
        }
      } catch (err) {
        if (mounted) {
          const message =
            err.message ||
            (isSignIn
              ? 'Sign-in link expired or invalid. Request a new link.'
              : 'Verification link expired or invalid. Request a new email.');
          toast(message, 'error');
          navigate(isSignIn ? '/login' : '/verify-email', { replace: true });
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
    return (
      <AuthLoading
        message={hasEmailSignInLink(location.search) ? 'Signing you in…' : 'Confirming your email…'}
        stage="Securing your session…"
      />
    );
  }

  return children;
}
