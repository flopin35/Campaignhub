import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  loginWithEmail,
  isUserVerified,
} from '../services/authService';
import { getAuthErrorMessage } from '../utils/authErrors';
import { resolvePostLoginPath } from '../utils/authVerification';
import { useToast } from '../context/ToastContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import OtpLoginForm from '../components/OtpLoginForm';
import AuthShell from '../components/AuthShell';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const from = location.state?.from?.pathname || '/dashboard';

  const [mode, setMode] = useState('password');
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successPulse, setSuccessPulse] = useState(false);

  const goAfterLogin = (user, profile) => {
    const verified = isUserVerified(user, profile);
    const dest = resolvePostLoginPath(verified, from);
    if (!verified) {
      toast('Please verify your email to access your dashboard.', 'warning');
      navigate(dest, { state: { from: location.state?.from }, replace: true });
      return;
    }
    setSuccessPulse(true);
    toast('Welcome back!', 'success');
    setTimeout(() => navigate(dest, { replace: true }), 400);
  };

  const handleOtpSuccess = ({ user, profile }) => goAfterLogin(user, profile);

  const handleGoogleSuccess = ({ user, profile }) => goAfterLogin(user, profile);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user, profile } = await loginWithEmail(form.email, form.password);
      goAfterLogin(user, profile);
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
      title="Welcome back"
      subtitle="Sign in securely to manage your campaigns"
      footer={
        <p className="text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="text-brand-400 hover:text-brand-300 transition-colors">
            Sign up free
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
          Login successful — redirecting…
        </motion.div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <GoogleSignInButton onSuccess={handleGoogleSuccess} returnTo={from} />

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
          { id: 'password', label: 'Password' },
          { id: 'otp', label: '6-digit code' },
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
        <OtpLoginForm
          onSuccess={handleOtpSuccess}
          mode="login"
          onUsePassword={(otpEmail) => {
            setMode('password');
            setError('');
            if (otpEmail) setForm((f) => ({ ...f, email: otpEmail }));
          }}
        />
      ) : (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
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
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-300">Password</label>
              <Link to="/forgot-password" className="text-xs text-brand-400 hover:text-brand-300">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="input-field"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-3 disabled:opacity-50">
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
