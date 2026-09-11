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
    <div className="cart-page mx-auto max-w-market px-4 pb-28 pt-5 md:pb-20 md:pt-8 lg:px-8 lg:pt-12">
      <Eyebrow>Your cart</Eyebrow>
      <h1 className="mt-2 font-display text-[1.85rem] tracking-[-0.03em] text-charcoal sm:text-5xl md:mt-3">Your cart</h1>
      <p className="mt-2 hidden max-w-xl text-sm leading-7 text-stone-600 md:mt-3 md:block">
        Review your selection before checkout and mock UPI payment.
      </p>

      <div className="mt-6 grid gap-6 lg:mt-10 lg:grid-cols-[1fr_0.42fr] lg:gap-8">
        <div className="space-y-3 md:space-y-5">
          {items.map((item) => (
            <article key={item.productId} className="cart-item">
              <Link to={`/marketplace/${item.productId}`} className="cart-item-image">
                <ImageFrame src={item.image} alt={item.title} className="aspect-square" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/marketplace/${item.productId}`} className="line-clamp-2 break-words text-[0.95rem] font-semibold text-charcoal hover:text-terracotta">
                  {item.title}
                </Link>
                <p className="mt-1 text-sm text-stone-500">{formatCurrency(item.unitPrice)} each</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="inline-flex items-center rounded-md border border-stone-300 bg-cream">
                    <button
                      type="button"
                      aria-label="Decrease quantity"
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="min-h-11 min-w-11 text-stone-700"
                    >
                      <Minus className="mx-auto h-4 w-4" strokeWidth={1.75} />
                    </button>
                    <span className="min-w-7 text-center text-sm font-semibold text-charcoal">{item.quantity}</span>
                    <button
                      type="button"
                      aria-label="Increase quantity"
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      disabled={item.quantity >= item.maxStock}
                      className="min-h-11 min-w-11 text-stone-700 disabled:opacity-40"
                    >
                      <Plus className="mx-auto h-4 w-4" strokeWidth={1.75} />
                    </button>
                  </div>
                  <p className="text-base font-semibold tabular-nums text-charcoal">{formatCurrency(item.unitPrice * item.quantity)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.productId)}
                  className="mt-2 inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-stone-500 hover:text-terracotta"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.75} /> Remove
                </button>
              </div>
            </article>
          ))}
        </div>

        <aside className="cart-summary panel h-fit p-5 md:p-6">
          <Eyebrow>Summary</Eyebrow>
          <p className="mt-4 font-display text-3xl text-charcoal md:mt-5 md:text-4xl">{formatCurrency(subtotal)}</p>
          <p className="mt-2 text-sm text-stone-500">Mock UPI payment at checkout. No real money is charged.</p>
          <div className="mt-6 hidden space-y-3 md:mt-8 md:block">
            <Button className="w-full" onClick={() => navigate('/checkout')}>Proceed to checkout</Button>
            <Button variant="light" className="w-full" onClick={() => navigate('/marketplace')}>Continue browsing</Button>
          </div>
        </aside>
      </div>

      <div className="pdp-buybar md:hidden">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Total</p>
          <p className="truncate font-display text-xl text-charcoal">{formatCurrency(subtotal)}</p>
        </div>
        <button type="button" onClick={() => navigate('/checkout')} className="button-dark min-h-12 flex-1 rounded-md px-4 text-sm font-semibold">
          Checkout
        </button>
      </div>
    </div>
  );
};

export default CartPage;
