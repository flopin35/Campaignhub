import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { signUpWithEmail, isUserVerified } from '../services/authService';
import { getAuthErrorMessage } from '../utils/authErrors';
import { resolvePostLoginPath } from '../utils/authVerification';
import { useToast } from '../context/ToastContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import OtpLoginForm from '../components/OtpLoginForm';
import AuthShell from '../components/AuthShell';

export default function Signup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState('password');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successPulse, setSuccessPulse] = useState(false);

  const finishSignup = (user, profile, isNew = true) => {
    const verified = isUserVerified(user, profile);
    if (!verified) {
      toast('Account created! Check your email to verify.', 'success');
      navigate('/verify-email', { replace: true });
      return;
    }
    setSuccessPulse(true);
    toast(isNew ? 'Welcome to CampaignHub!' : 'Welcome back!', 'success');
    setTimeout(() => navigate('/dashboard', { replace: true }), 450);
  };

  const handleOtpSuccess = ({ user, profile, isNewUser }) => finishSignup(user, profile, isNewUser !== false);

  const handleGoogleSuccess = ({ user, profile }) => finishSignup(user, profile, true);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(form.name, form.email, form.password);
      navigate('/verify-email', { replace: true });
    } catch (err) {
      const msg = getAuthErrorMessage(err.code) || err.message;
      setError(msg);
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join CampaignHub — launch campaigns in minutes"
      footer={
        <p className="text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 transition-colors">
            Sign in
          </Link>
        </p>
      }
    >
      {successPulse && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm text-center"
        >
          Account ready — opening dashboard…
        </motion.div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <GoogleSignInButton
        onSuccess={handleGoogleSuccess}
        label="Sign up with Google"
        returnTo="/dashboard"
      />

      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-surface-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3 bg-surface-card text-gray-500">or use email</span>
        </div>
      </div>

      <div className="flex rounded-xl bg-surface-elevated p-1 border border-surface-border">
        {[
          { id: 'otp', label: 'Email code' },
          { id: 'password', label: 'Password' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setMode(tab.id);
              setError('');
            }}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${
              mode === tab.id ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mode === 'otp' ? (
        <OtpLoginForm onSuccess={handleOtpSuccess} mode="signup" />
      ) : (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoComplete="name"
              placeholder="John Doe"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              autoComplete="new-password"
              placeholder="Min. 6 characters"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
            <input
              type="password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              className="input-field"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-50">
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
          <p className="text-xs text-gray-500 text-center">
            Email signup requires verification before uploading campaigns.
          </p>
        </form>
      )}
    </AuthShell>
  );
}
