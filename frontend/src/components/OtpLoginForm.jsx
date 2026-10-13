import { useState, useEffect, useRef, useCallback } from 'react';
import { otpService } from '../services/otpService';
import { sanitizeEmail, sendEmailSignInLink } from '../services/authService';
import { useToast } from '../context/ToastContext';
import { Shield, Mail, Link2 } from 'lucide-react';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function OtpLoginForm({ onSuccess, mode = 'login', onUsePassword }) {
  const { toast } = useToast();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const sendMagicLink = useCallback(async () => {
    const normalized = sanitizeEmail(email);
    if (!normalized) {
      setError('Enter a valid email address.');
      return false;
    }
    await sendEmailSignInLink(normalized);
    setStep('link');
    setCooldown(RESEND_SECONDS);
    toast('Sign-in link sent! Check your inbox and spam folder.', 'success');
    return true;
  }, [email, toast]);

  const sendCode = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const data = await otpService.sendCode(email);
      setStep('verify');
      setCooldown(data?.cooldownSeconds || RESEND_SECONDS);
      setDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
      toast('6-digit code sent. Check your inbox and spam folder.', 'success');
    } catch (err) {
      const code = err.code || '';
      const msg = err.message || '';
      const shouldFallback =
        code === 'OTP_UNAVAILABLE' ||
        code === 'NETWORK_ERROR' ||
        msg.includes('not configured') ||
        msg.includes('not enabled') ||
        msg.includes('OTP service') ||
        msg.includes('took too long') ||
        msg.includes('could not reach') ||
        msg.includes('timeout');

      if (shouldFallback) {
        try {
          await sendMagicLink();
          setError('');
          toast('6-digit code unavailable — sent a sign-in link instead.', 'info');
        } catch (linkErr) {
          setError(
            linkErr.message ||
              'Could not send email. Try Password or Google sign-in, or check your email address.'
          );
        }
      } else {
        setError(msg || 'Could not send code.');
      }
    } finally {
      setLoading(false);
    }
  }, [email, sendMagicLink, toast]);

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!sanitizeEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    sendCode();
  };

  const handleSendLinkOnly = async (e) => {
    e.preventDefault();
    if (!sanitizeEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await sendMagicLink();
    } catch (err) {
      setError(err.message || 'Could not send sign-in link.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (code) => {
    setError('');
    setLoading(true);
    try {
      const result = await otpService.verifyCode(email, code);
      onSuccess?.(result);
    } catch (err) {
      setError(err.message || 'Invalid code.');
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (index, value) => {
    const v = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = v;
    setDigits(next);
    if (v && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
    if (next.every((d) => d) && next.join('').length === OTP_LENGTH) {
      handleVerify(next.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((c, i) => {
      next[i] = c;
    });
    setDigits(next);
    if (pasted.length === OTP_LENGTH) handleVerify(pasted);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-success bg-success-soft border border-success/20 rounded-xl px-3 py-2">
        <Shield className="w-3.5 h-3.5 shrink-0" />
        <span>Email sign-in · code or secure link · check spam if missing</span>
      </div>

      {error && (
        <div className="p-3 bg-danger-soft border border-danger/20 rounded-xl text-danger text-sm space-y-2">
          <p>{error}</p>
          {onUsePassword && (
            <button
              type="button"
              onClick={() => onUsePassword(email)}
              className="text-link hover:underline text-xs font-medium"
            >
              Switch to password sign-in →
            </button>
          )}
        </div>
      )}

      <>
        {step === 'email' ? (
          <form
            key="email"
            onSubmit={handleEmailSubmit}
            className="space-y-4 animate-fade-up"
          >
            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="input pl-10"
                  disabled={loading}
                />
              </div>
              <p className="hint">
                We&apos;ll email a 6-digit code, or a secure sign-in link if codes aren&apos;t available.
              </p>
            </div>
            <button type="submit" disabled={loading} className="btn btn-lg btn-primary w-full">
              {loading ? 'Sending…' : mode === 'signup' ? 'Send email & continue' : 'Send sign-in email'}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleSendLinkOnly}
              className="w-full text-xs text-link hover:underline inline-flex items-center justify-center gap-1.5"
            >
              <Link2 className="w-3.5 h-3.5" />
              Send secure link instead (no code)
            </button>
            {onUsePassword && (
              <button
                type="button"
                onClick={() => onUsePassword(email)}
                className="w-full text-xs text-ink-3 hover:text-ink"
              >
                Prefer password? Switch to password sign-in
              </button>
            )}
          </form>
        ) : step === 'link' ? (
          <div
            key="link"
            className="space-y-4 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-info-soft flex items-center justify-center mx-auto">
              <Mail className="w-6 h-6 text-info" />
            </div>
            <p className="text-sm text-ink-2">
              Sign-in link sent to <span className="text-ink font-medium">{email}</span>
            </p>
            <p className="text-xs text-ink-3 leading-relaxed">
              Open the email from Firebase / CampaignHub and tap the link on this device.
              Check spam or promotions if you don&apos;t see it within a minute.
            </p>
            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setError('');
                }}
                className="text-ink-3 hover:text-ink"
              >
                Change email
              </button>
              <button
                type="button"
                disabled={cooldown > 0 || loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    await sendMagicLink();
                  } catch (err) {
                    setError(err.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="text-link hover:underline disabled:opacity-40"
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend link'}
              </button>
            </div>
            {onUsePassword && (
              <button
                type="button"
                onClick={() => onUsePassword(email)}
                className="text-xs text-ink-3 hover:text-ink"
              >
                Use password instead →
              </button>
            )}
          </div>
        ) : (
          <div
            key="verify"
            className="space-y-4"
          >
            <p className="text-sm text-ink-2 text-center">
              6-digit code sent to <span className="text-ink font-medium">{email}</span>
            </p>
            <div className="flex justify-center gap-2" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  disabled={loading}
                  className="w-11 h-12 text-center text-lg font-semibold bg-surface border border-line-strong rounded-xl text-ink focus:border-link focus:shadow-ring outline-none"
                  aria-label={`Digit ${i + 1}`}
                />
              ))}
            </div>
            {loading && (
              <p className="text-center text-sm text-link animate-pulse">Verifying securely…</p>
            )}
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setError('');
                  }}
                  className="text-ink-3 hover:text-ink"
                >
                  Change email
                </button>
                <button
                  type="button"
                  disabled={cooldown > 0 || loading}
                  onClick={sendCode}
                  className="text-link hover:underline disabled:opacity-40"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                </button>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    await sendMagicLink();
                  } catch (err) {
                    setError(err.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="text-link hover:underline text-center"
              >
                Didn&apos;t get a code? Send sign-in link instead
              </button>
            </div>
          </div>
        )}
      </>
    </div>
  );
}
