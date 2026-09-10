import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, EmptyState, Eyebrow } from '../components/DesignSystem';
import { ProductCard } from '../components/ProductCard';
import { useWishlist } from '../context/WishlistContext';

const WishlistPage: React.FC = () => {
  const navigate = useNavigate();
  const { items } = useWishlist();

  return (
    <div className="mx-auto max-w-market px-4 pb-20 pt-8 lg:px-8 lg:pt-12">
      <Eyebrow>Saved pieces</Eyebrow>
      <h1 className="mt-3 font-display text-4xl tracking-[-0.03em] text-charcoal sm:text-5xl">Your wishlist</h1>
      <p className="mt-3 max-w-xl text-sm leading-7 text-stone-600">
        Pieces you want to return to — saved on this device until you are ready to buy.
      </p>

      {items.length ? (
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {items.map((listing) => (
            <ProductCard key={listing.id} listing={listing} compact />
          ))}
        </div>
      ) : (
        <div className="mt-10 space-y-6">
          <EmptyState
            title="Nothing saved yet."
            description="Tap the heart on a product to keep it here while you browse."
          />
          <Button onClick={() => navigate('/marketplace')}>Browse marketplace</Button>
        </div>
      )}
    </div>
  );
};

export default WishlistPage;
