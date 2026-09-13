import React, { useCallback, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button, Eyebrow, Field } from './DesignSystem';
import { CaptchaWidget, isCaptchaConfigured } from './CaptchaWidget';
import { useAuth } from '../auth/useAuthHook';

type LoginLocationState = { from?: { pathname?: string } } | null;
type AuthMode = 'login' | 'register' | 'forgot';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithEmail, signUpWithEmail, requestPasswordReset, user, profile, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [mode, setMode] = useState<AuthMode>('login');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const redirectPath = (location.state as LoginLocationState)?.from?.pathname || '/';
  const captchaRequired = isCaptchaConfigured();

  const onCaptcha = useCallback((token: string | null) => {
    setCaptchaToken(token);
  }, []);

  const ensureCaptcha = () => {
    if (captchaRequired && !captchaToken) {
      throw new Error('Please complete the CAPTCHA verification.');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'forgot') {
        ensureCaptcha();
        await requestPasswordReset(email.trim());
        setSuccess('If an account exists for that email, a reset link has been sent. Check your inbox.');
        setMode('login');
        return;
      }

      ensureCaptcha();

      if (mode === 'register') {
        if (!fullName.trim()) throw new Error('Please enter your name.');
        if (password.length < 8) throw new Error('Password must be at least 8 characters.');
        if (password !== confirmPassword) throw new Error('Passwords do not match.');
        await signUpWithEmail(email.trim(), password, fullName.trim(), 'consumer');
        setMode('login');
        setSuccess('Account created. You can now sign in.');
        setPassword('');
        setConfirmPassword('');
      } else {
        await loginWithEmail(email.trim(), password, 'consumer');
        navigate(redirectPath);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'forgot' ? 'Reset your password.' : mode === 'register' ? 'Create your account.' : 'Welcome back.';
  const subtitle = mode === 'forgot'
    ? 'Enter your email and we will send a secure reset link.'
    : 'Sign in to checkout, save pieces, and keep your orders in one place.';

  return (
    <div className="auth-page mx-auto grid max-w-market gap-6 px-4 py-8 lg:grid-cols-[0.9fr_0.75fr] lg:gap-16 lg:px-8 lg:py-16">
      <div className="auth-intro flex flex-col justify-between">
        <div className="space-y-3 md:space-y-6">
          <Eyebrow>Customer account</Eyebrow>
          <h1 className="hero-title max-w-xl font-display text-[1.85rem] leading-[1.1] tracking-[-0.03em] sm:text-5xl">{title}</h1>
          <p className="max-w-md text-sm leading-7 text-stone-600">{subtitle}</p>
        </div>
        <p className="mt-6 hidden max-w-xs text-sm leading-6 text-stone-500 md:mt-10 md:block">
          Artisan studio access stays on the artisan dashboard. This page is for customers only.
        </p>
      </div>

      <div className="auth-panel rounded-xl border border-stone-300 bg-cream p-5 sm:p-8 lg:mt-4">
        {user && profile ? (
          <div className="space-y-6">
            <p className="text-sm leading-7 text-stone-600">
              Signed in as <span className="font-semibold text-charcoal">{profile.full_name || user.email}</span>.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => navigate('/orders')}>View orders</Button>
              <Button variant="light" onClick={() => navigate('/cart')}>Go to cart</Button>
              <Button variant="light" onClick={() => navigate('/checkout')}>Checkout</Button>
              <Button variant="light" onClick={() => { void logout(); }}>Sign out</Button>
            </div>
          </div>
        ) : (
          <>
            {error && <p className="mb-5 rounded-xl bg-mustard/15 px-4 py-3 text-sm leading-6 text-stone-800">{error}</p>}
            {success && <p className="mb-5 rounded-xl bg-royal/10 px-4 py-3 text-sm leading-6 text-royal">{success}</p>}

            <form onSubmit={handleSubmit} className="space-y-6">
              {mode === 'register' && (
                <Field label="Your name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Enter your name" autoComplete="name" required />
              )}
              <Field label="Email address" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" autoComplete="email" inputMode="email" required />
              {mode !== 'forgot' && (
                <Field label="Password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required />
              )}
              {mode === 'register' && (
                <Field label="Confirm password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm your password" type="password" autoComplete="new-password" required />
              )}

              <CaptchaWidget onVerify={onCaptcha} />

              <Button type="submit" disabled={loading} className="w-full justify-between">
                {loading
                  ? 'Please wait'
                  : mode === 'forgot'
                    ? 'Send reset link'
                    : mode === 'register'
                      ? 'Create account'
                      : 'Sign in'}
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </form>

            <div className="mt-6 flex flex-col gap-3 text-sm text-stone-600">
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => { setMode('forgot'); setError(''); setSuccess(''); }}
                  className="text-left font-semibold text-royal underline decoration-gold/50 underline-offset-4 hover:text-terracotta"
                >
                  Forgot password?
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setMode((current) => (current === 'register' ? 'login' : 'register'));
                  setError('');
                  setSuccess('');
                }}
                className="text-left underline decoration-stone-300 underline-offset-4 hover:text-terracotta"
              >
                {mode === 'register' ? 'Already have an account? Sign in' : 'New here? Create a buyer account'}
              </button>
              {mode === 'forgot' && (
                <button type="button" onClick={() => setMode('login')} className="text-left underline decoration-stone-300 underline-offset-4">
                  Back to sign in
                </button>
              )}
              <Link to="/join" className="text-stone-500 hover:text-royal">
                Are you an artisan? Join ARTISAN →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
