import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail } from './icons/AppIcons';
import { useAuth } from '../context/AuthContext';
import { resendVerificationEmail } from '../services/authService';

export default function VerifyEmailNotice({ compact = false }) {
  const { user, refreshUser } = useAuth();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!user || user.emailVerified) return null;

  const handleResend = async () => {
    setError('');
    setMessage('');
    setSending(true);
    try {
      await resendVerificationEmail();
      setMessage('Verification email sent! Check your inbox.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    setError('');
    try {
      const updated = await refreshUser();
      if (updated?.emailVerified) {
        setMessage('Email verified! You now have full access.');
      } else {
        setError('Not verified yet. Please check your email and click the link.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <span className="text-xs text-amber-400">Verify your email</span>
        <button onClick={handleResend} disabled={sending} className="text-xs text-brand-400 hover:underline">
          Resend
        </button>
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
          <h3 className="font-medium text-white mb-1">Verify your email</h3>
          <p className="text-sm text-gray-400 mb-4">
            We sent a verification link to <strong className="text-gray-300">{user.email}</strong>.
            Verify your email to upload campaigns and access all features.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleResend}
              disabled={sending}
              className="btn-secondary text-sm py-2 disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Resend Email'}
            </button>
            <button
              onClick={handleCheck}
              disabled={checking}
              className="btn-primary text-sm py-2 disabled:opacity-50"
            >
              {checking ? 'Checking...' : "I've Verified"}
            </button>
          </div>

          {message && <p className="text-emerald-400 text-sm mt-3">{message}</p>}
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </div>
      </div>
    </motion.div>
  );
}
