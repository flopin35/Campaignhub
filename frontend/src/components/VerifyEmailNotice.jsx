import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, CircleCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { resendVerificationEmail, checkEmailVerificationStatus } from '../services/authService';
import { resolvePostLoginPath } from '../utils/authVerification';
import AuthLoading from './AuthLoading';
import AuthShell from './AuthShell';
import { Button } from './ui';

export default function VerifyEmailNotice({ compact = false, autoRedirect = !compact }) {
  const { user, refreshUser, isVerified } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!autoRedirect || !isVerified) return;
    toast('Email verified! Welcome to CampaignHub.', 'success');
    navigate(resolvePostLoginPath(true, location.state?.from?.pathname || '/dashboard'), { replace: true });
  }, [autoRedirect, isVerified, navigate, location.state?.from?.pathname, toast]);

  if (!user || isVerified) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      await resendVerificationEmail();
      toast('Verification email sent. Check your inbox and spam folder.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    try {
      const { verified } = await checkEmailVerificationStatus();
      await refreshUser();
      toast(verified ? 'Email verified!' : 'Not verified yet. Click the link in your email, then try again.', verified ? 'success' : 'warning');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setChecking(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-warning-soft border border-warning/25 rounded-lg text-xs">
        <span className="text-warning">Verify your email</span>
        <Link to="/verify-email" className="text-link hover:underline">Verify now</Link>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-start gap-4">
        <span className="w-11 h-11 rounded-xl bg-warning-soft text-warning flex items-center justify-center shrink-0">
          <Mail className="w-5 h-5" />
        </span>
        <div>
          <p className="text-[15px] text-ink-2">
            We sent a verification link to <strong className="text-ink">{user.email}</strong>. Click it to open your campaign dashboard.
          </p>
          <ol className="mt-4 space-y-1 list-decimal list-inside text-sm text-ink-2">
            <li>Open the email (check spam or promotions)</li>
            <li>Click the verification link</li>
            <li>Come back here — we detect it automatically</li>
          </ol>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={handleCheck} loading={checking}>I&apos;ve verified my email</Button>
            <Button variant="secondary" onClick={handleResend} loading={sending}>Resend email</Button>
          </div>
          <p className="mt-4 text-xs text-ink-3 flex items-center gap-1.5">
            <CircleCheck className="w-3.5 h-3.5 text-success" /> Checking automatically every few seconds
          </p>
        </div>
      </div>
    </div>
  );
}

export function VerifyEmailPage() {
  const { user, loading, isVerified } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isVerified) navigate('/dashboard', { replace: true });
  }, [loading, isVerified, navigate]);

  if (loading) return <AuthLoading message="Loading your account…" />;
  if (!user) {
    return (
      <AuthShell title="Verify your email" subtitle="Sign in first to verify your email address.">
        <Button to="/login" block size="lg">Sign in</Button>
      </AuthShell>
    );
  }
  if (isVerified) return <AuthLoading message="Email verified — opening your dashboard…" />;

  return (
    <AuthShell
      title="Verify your email"
      subtitle="One quick step before you launch your campaign."
      footer={
        <p className="text-sm text-ink-3">
          Wrong account? <Link to="/login" className="text-link hover:underline">Sign in with a different email</Link>
        </p>
      }
    >
      <VerifyEmailNotice />
    </AuthShell>
  );
}
