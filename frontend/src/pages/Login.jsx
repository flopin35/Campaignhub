import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { loginWithEmail, isUserVerified } from '../services/authService';
import { getAuthErrorMessage } from '../utils/authErrors';
import { resolvePostLoginPath } from '../utils/authVerification';
import { useToast } from '../context/ToastContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import OtpLoginForm from '../components/OtpLoginForm';
import AuthShell from '../components/AuthShell';
import { Segmented, Input, Button, Alert } from '../components/ui';

export function OrDivider({ label = 'or use email' }) {
  return (
    <div className="relative py-1" aria-hidden>
      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-line" /></div>
      <div className="relative flex justify-center text-xs"><span className="px-3 bg-canvas text-ink-3">{label}</span></div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const from = location.state?.from?.pathname || '/dashboard';
  const [mode, setMode] = useState('otp');
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const goAfterLogin = (user, profile) => {
    const verified = isUserVerified(user, profile);
    const dest = resolvePostLoginPath(verified, from);
    if (!verified) {
      toast('Please verify your email to open your campaign.', 'warning');
      navigate(dest, { state: { from: location.state?.from }, replace: true });
      return;
    }
    toast('Welcome back!', 'success');
    navigate(dest, { replace: true });
  };

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
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your campaign headquarters."
      footer={
        <p className="text-sm text-ink-3">
          New to CampaignHub?{' '}
          <Link to="/signup" className="text-link font-medium hover:underline">Start your free trial</Link>
        </p>
      }
    >
      {error && <Alert tone="danger">{error}</Alert>}
      <GoogleSignInButton onSuccess={({ user, profile }) => goAfterLogin(user, profile)} returnTo={from} />
      <OrDivider />
      <Segmented
        full
        value={mode}
        onChange={(m) => {
          setMode(m);
          setError('');
        }}
        options={[
          { value: 'otp', label: 'Email code' },
          { value: 'password', label: 'Password' },
        ]}
      />
      {mode === 'otp' ? (
        <OtpLoginForm
          onSuccess={({ user, profile }) => goAfterLogin(user, profile)}
          mode="login"
          onUsePassword={(otpEmail) => {
            setMode('password');
            setError('');
            if (otpEmail) setForm((f) => ({ ...f, email: otpEmail }));
          }}
        />
      ) : (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <Input label="Email" type="email" required autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="login-password" className="text-sm font-medium text-ink">Password</label>
              <Link to="/forgot-password" className="text-xs text-link hover:underline">Forgot password?</Link>
            </div>
            <input id="login-password" type="password" required autoComplete="current-password" className="input" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <Button type="submit" size="lg" block loading={loading}>Sign in</Button>
        </form>
      )}
    </AuthShell>
  );
}
