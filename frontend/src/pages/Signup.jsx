import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signUpWithEmail, isUserVerified } from '../services/authService';
import { getAuthErrorMessage } from '../utils/authErrors';
import { useToast } from '../context/ToastContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import OtpLoginForm from '../components/OtpLoginForm';
import AuthShell from '../components/AuthShell';
import { Segmented, Input, Button, Alert } from '../components/ui';
import { OrDivider } from './Login';

export default function Signup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState('otp');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const finish = (user, profile, isNew = true) => {
    if (!isUserVerified(user, profile)) {
      toast('Account created! Check your email to verify.', 'success');
      navigate('/verify-email', { replace: true });
      return;
    }
    toast(isNew ? 'Welcome to CampaignHub!' : 'Welcome back!', 'success');
    navigate('/dashboard', { replace: true });
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const { user, profile } = await signUpWithEmail(form.name, form.email, form.password);
      finish(user, profile, true);
    } catch (err) {
      setError(getAuthErrorMessage(err.code) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Start your free trial"
      subtitle="7 days of every Pro tool. No payment needed to start."
      footer={
        <p className="text-sm text-ink-3">
          Already have an account?{' '}
          <Link to="/login" className="text-link font-medium hover:underline">Sign in</Link>
          <span className="block mt-3 text-xs">
            By continuing you agree to our <Link to="/terms" className="underline">terms</Link> and <Link to="/privacy" className="underline">privacy policy</Link>.
          </span>
        </p>
      }
    >
      {error && <Alert tone="danger">{error}</Alert>}
      <GoogleSignInButton onSuccess={({ user, profile }) => finish(user, profile, true)} label="Sign up with Google" returnTo="/dashboard" />
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
          onSuccess={({ user, profile, isNewUser }) => finish(user, profile, isNewUser !== false)}
          mode="signup"
          onUsePassword={(otpEmail) => {
            setMode('password');
            setError('');
            if (otpEmail) setForm((f) => ({ ...f, email: otpEmail }));
          }}
        />
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Input label="Full name" required autoComplete="name" placeholder="e.g. Ama Mensah" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Email" type="email" required autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Password" type="password" required minLength={6} autoComplete="new-password" placeholder="At least 6 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Button type="submit" size="lg" block loading={loading}>Create account</Button>
        </form>
      )}
    </AuthShell>
  );
}
