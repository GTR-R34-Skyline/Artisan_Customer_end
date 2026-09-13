import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, EmptyState, Eyebrow } from '../components/DesignSystem';
import { ProductCard } from '../components/ProductCard';
import { useWishlist } from '../context/WishlistContext';

const WishlistPage: React.FC = () => {
  const navigate = useNavigate();
  const { items } = useWishlist();

  return (
    <div className="mx-auto max-w-market px-4 pb-20 pt-5 lg:px-8 lg:pt-12">
      <Eyebrow>Saved pieces</Eyebrow>
      <h1 className="mt-2 font-display text-[1.85rem] tracking-[-0.03em] text-charcoal sm:text-5xl md:mt-3">Your wishlist</h1>
      <p className="mt-2 hidden max-w-xl text-sm leading-7 text-stone-600 md:mt-3 md:block">
        Pieces you want to return to — saved on this device until you are ready to buy.
      </p>

      {items.length ? (
        <div className="product-grid mt-8">
          {items.map((listing) => (
            <ProductCard key={listing.id} listing={listing} compact />
          ))}
        </div>
      ) : (
        <div className="mt-10 space-y-6">
          <EmptyState
            title="Your wishlist is waiting for something beautiful."
            description="Tap the heart on a product to keep it here while you browse."
          >
            <Button onClick={() => navigate('/marketplace')}>Shop Now</Button>
          </EmptyState>
        </div>
      )}
    </div>
  );
};

export default WishlistPage;
