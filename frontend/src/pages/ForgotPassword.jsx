import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { sendPasswordReset } from '../services/authService';
import { getAuthErrorMessage } from '../utils/authErrors';
import AuthShell from '../components/AuthShell';
import { Input, Button, Alert } from '../components/ui';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(getAuthErrorMessage(err.code) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll email you a secure link to choose a new one."
      footer={<Link to="/login" className="text-sm text-link font-medium hover:underline">Back to sign in</Link>}
    >
      {sent ? (
        <Alert tone="success" icon={MailCheck} title="Check your inbox">
          We sent a reset link to <strong>{email}</strong>. Check spam if it doesn&apos;t arrive within a minute.
        </Alert>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <Alert tone="danger">{error}</Alert>}
          <Input label="Email" type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" size="lg" block loading={loading}>Send reset link</Button>
        </form>
      )}
    </AuthShell>
  );
}
