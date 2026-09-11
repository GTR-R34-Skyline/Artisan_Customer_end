import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button, Eyebrow, Field } from './DesignSystem';
import { useAuth } from '../auth/useAuthHook';

type LoginLocationState = { from?: { pathname?: string } } | null;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithEmail, signUpWithEmail, user, profile, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const redirectPath = (location.state as LoginLocationState)?.from?.pathname || '/';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        if (!fullName.trim()) throw new Error('Please enter your name.');
        await signUpWithEmail(email.trim(), password, fullName.trim(), 'consumer');
        setIsRegistering(false);
        setError('Account created. You can now sign in.');
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

  return (
    <div className="auth-page mx-auto grid max-w-market gap-6 px-4 py-8 lg:grid-cols-[0.9fr_0.75fr] lg:gap-16 lg:px-8 lg:py-20">
      <div className="auth-intro flex flex-col justify-between">
        <div className="space-y-3 md:space-y-6">
          <Eyebrow>Buyer sign in</Eyebrow>
          <h1 className="hero-title max-w-xl font-display text-[1.85rem] leading-[1.1] tracking-[-0.03em] sm:text-6xl">Welcome back.</h1>
          <p className="max-w-md text-sm leading-7 text-stone-600">Sign in to checkout, save pieces, and keep your orders in one place.</p>
        </div>
        <p className="mt-6 hidden max-w-xs text-sm leading-6 text-stone-500 md:mt-10 md:block">Checkout uses a simulated UPI payment. No real money is charged.</p>
      </div>

      <div className="auth-panel border border-stone-300 p-5 sm:p-8 lg:mt-4">
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
            {error && <p className="mb-6 rounded-xl bg-mustard/15 px-4 py-3 text-sm leading-6 text-stone-800">{error}</p>}

            <form onSubmit={handleSubmit} className="space-y-8">
              {isRegistering && (
                <Field label="Your name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Enter your name" autoComplete="name" required />
              )}
              <Field label="Email address" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" autoComplete="email" inputMode="email" required />
              <Field label="Password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" type="password" autoComplete={isRegistering ? 'new-password' : 'current-password'} required />
              <Button type="submit" disabled={loading} className="w-full justify-between">
                {loading ? 'Signing in' : isRegistering ? 'Create account' : 'Sign in'}
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </form>

            <button
              type="button"
              onClick={() => { setIsRegistering((registering) => !registering); setError(''); }}
              className="mt-6 text-sm text-stone-600 underline decoration-stone-300 underline-offset-4 hover:text-terracotta"
            >
              {isRegistering ? 'Already have an account? Sign in' : 'New here? Create a buyer account'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
