import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuthHook';
import { useCart } from '../context/CartContext';
import { Button, EmptyState, Eyebrow, Field, LoadingState } from '../components/DesignSystem';
import {
  createCheckoutIdempotencyKey,
  createCheckoutOrder,
  formatCurrency,
  rememberCheckoutIdempotencyKey,
} from '../services/checkout.service';

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const [shippingAddress, setShippingAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (authLoading) {
    return <div className="mx-auto max-w-market px-4 py-16 lg:px-8"><LoadingState label="Preparing checkout" /></div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-market px-4 py-16 lg:px-8">
        <EmptyState title="Sign in to continue." description="Checkout is available to signed-in collectors.">
          <Button onClick={() => navigate('/login', { state: { from: { pathname: '/checkout' } } })}>Sign in</Button>
        </EmptyState>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="mx-auto max-w-market px-4 py-16 lg:px-8">
        <EmptyState title="Your cart is empty." description="Add a piece before proceeding to checkout.">
          <Button onClick={() => navigate('/marketplace')}>Browse collection</Button>
        </EmptyState>
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const idempotencyKey = createCheckoutIdempotencyKey();
      rememberCheckoutIdempotencyKey(idempotencyKey);
      const { order } = await createCheckoutOrder({
        items,
        shippingAddress,
        idempotencyKey,
      });
      clearCart();
      navigate(`/checkout/payment/${order.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Checkout could not be completed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-market px-4 pb-24 pt-5 lg:px-8 lg:pt-12">
      <Eyebrow>Checkout</Eyebrow>
      <h1 className="mt-2 font-display text-[1.85rem] tracking-[-0.03em] text-charcoal sm:text-5xl md:mt-3">Delivery details</h1>
      <p className="mt-3 max-w-xl text-sm leading-7 text-stone-600">
        Signed in as {profile?.full_name || user.email}. After confirming, you will complete a secure Razorpay payment.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 grid gap-6 lg:mt-10 lg:grid-cols-[1fr_0.42fr] lg:gap-8">
        <div className="space-y-8">
          <Field
            label="Delivery address"
            value={shippingAddress}
            onChange={(event) => setShippingAddress(event.target.value)}
            placeholder="Name, street, city, state, PIN"
            textarea
            autoComplete="street-address"
            required
          />
          {error && <p className="rounded-xl bg-mustard/15 px-4 py-3 text-sm leading-6 text-stone-800">{error}</p>}
        </div>

        <aside className="panel h-fit p-6">
          <Eyebrow>Order summary</Eyebrow>
          <div className="mt-6 space-y-4">
            {items.map((item) => (
              <div key={item.productId} className="flex items-start justify-between gap-4 text-sm">
                <div>
                  <p className="text-stone-950">{item.title}</p>
                  <p className="mt-1 text-stone-500">Qty {item.quantity}</p>
                </div>
                <p className="text-stone-950">{formatCurrency(item.unitPrice * item.quantity)}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 border-t border-stone-300 pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Total</p>
            <p className="mt-2 font-display text-4xl text-charcoal">{formatCurrency(subtotal)}</p>
          </div>
          <div className="mt-8">
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Creating order' : 'Continue to payment'}
            </Button>
          </div>
        </aside>
      </form>
    </div>
  );
};

export default CheckoutPage;
