import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { Button, EmptyState, Eyebrow, ImageFrame } from '../components/DesignSystem';
import { formatCurrency } from '../services/checkout.service';

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, subtotal, updateQuantity, removeItem } = useCart();

  if (!items.length) {
    return (
      <div className="mx-auto max-w-market px-4 py-14 lg:px-8">
        <Eyebrow>Your cart</Eyebrow>
        <div className="mt-8">
          <EmptyState
            title="Your cart is empty."
            description="Browse the marketplace and add a handmade piece to begin checkout."
          >
            <Button onClick={() => navigate('/marketplace')}>Browse marketplace</Button>
          </EmptyState>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-market px-4 pb-20 pt-8 lg:px-8 lg:pt-12">
      <Eyebrow>Your cart</Eyebrow>
      <h1 className="mt-3 font-display text-4xl tracking-[-0.03em] text-charcoal sm:text-5xl">Your cart</h1>
      <p className="mt-3 max-w-xl text-sm leading-7 text-stone-600">
        Review your selection before checkout and mock UPI payment.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_0.42fr]">
        <div className="space-y-5">
          {items.map((item) => (
            <article key={item.productId} className="panel grid gap-4 p-4 sm:grid-cols-[7rem_1fr_auto] sm:items-center">
              <Link to={`/marketplace/${item.productId}`}>
                <ImageFrame src={item.image} alt={item.title} className="aspect-square" />
              </Link>
              <div>
                <Link to={`/marketplace/${item.productId}`} className="text-base font-semibold text-charcoal hover:text-terracotta">
                  {item.title}
                </Link>
                <p className="mt-1 text-sm text-stone-500">{formatCurrency(item.unitPrice)} each</p>
                <div className="mt-4 inline-flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="rounded-full border border-stone-300 p-2 text-stone-700"
                  >
                    <Minus className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                  <span className="min-w-8 text-center text-sm font-semibold text-charcoal">{item.quantity}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    disabled={item.quantity >= item.maxStock}
                    className="rounded-full border border-stone-300 p-2 text-stone-700 disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-between">
                <p className="text-lg font-semibold text-charcoal">{formatCurrency(item.unitPrice * item.quantity)}</p>
                <button
                  type="button"
                  onClick={() => removeItem(item.productId)}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-stone-500 hover:text-terracotta"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.75} /> Remove
                </button>
              </div>
            </article>
          ))}
        </div>

        <aside className="panel h-fit p-6">
          <Eyebrow>Summary</Eyebrow>
          <p className="mt-5 font-display text-4xl text-charcoal">{formatCurrency(subtotal)}</p>
          <p className="mt-2 text-sm text-stone-500">Mock UPI payment at checkout. No real money is charged.</p>
          <div className="mt-8 space-y-3">
            <Button className="w-full" onClick={() => navigate('/checkout')}>Proceed to checkout</Button>
            <Button variant="light" className="w-full" onClick={() => navigate('/marketplace')}>Continue browsing</Button>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CartPage;
