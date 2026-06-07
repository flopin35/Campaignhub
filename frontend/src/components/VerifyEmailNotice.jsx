import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { resendVerificationEmail } from '../services/authService';
import AuthLoading from '../components/AuthLoading';
import { Mail, CheckCircle2 } from './icons/AppIcons';

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
    const dest = location.state?.from?.pathname || '/dashboard';
    navigate(dest, { replace: true });
  }, [autoRedirect, isVerified, navigate, location.state?.from?.pathname, toast]);

  if (!user) return null;
  if (user.emailVerified) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      await resendVerificationEmail();
      toast('Verification email sent. Check your inbox.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    try {
      const updated = await refreshUser();
      if (updated?.emailVerified) {
        toast('Email verified! You now have full access.', 'success');
      } else {
        toast('Not verified yet. Click the link in your email, then try again.', 'warning');
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setChecking(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <span className="text-xs text-amber-400">Verify your email</span>
        <Link to="/verify-email" className="text-xs text-brand-400 hover:underline">
          Verify now
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card border-amber-500/20 bg-amber-500/5"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
          <Mail className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-white mb-1">Verify your email to continue</h3>
          <p className="text-sm text-gray-400 mb-4">
            We sent a secure verification link to{' '}
            <strong className="text-gray-300">{user.email}</strong>.
            Click the link to unlock uploads, your dashboard, and campaign management.
          </p>

          <ol className="text-xs text-gray-500 space-y-1 mb-4 list-decimal list-inside">
            <li>Open the email from CampaignHub</li>
            <li>Click the verification link</li>
            <li>Return here — we&apos;ll detect it automatically</li>
          </ol>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleResend}
              disabled={sending}
              className="btn-secondary text-sm py-2 disabled:opacity-50"
            >
              {sending ? 'Sending…' : 'Resend verification email'}
            </button>
            <button
              type="button"
              onClick={handleCheck}
              disabled={checking}
              className="btn-primary text-sm py-2 disabled:opacity-50"
            >
              {checking ? 'Checking…' : "I've verified my email"}
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-4 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Checking verification status automatically every few seconds
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/** Full-page verify email route */
export function VerifyEmailPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <AuthLoading message="Loading your account…" />;
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-gray-400 mb-4">Sign in to verify your email.</p>
        <Link to="/login" className="btn-primary text-sm">Sign in</Link>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 relative">
      <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg relative"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Verify your email</h1>
          <p className="text-gray-400 text-sm">
            One quick step before you can launch campaigns
          </p>
        </div>
        <VerifyEmailNotice />
        <p className="text-center text-sm text-gray-500 mt-6">
          Wrong account?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300">
            Sign in with a different email
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
