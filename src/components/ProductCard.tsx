import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MapPin, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { getProductImage, getProductPrice, getProductTitle, MarketplaceListing } from '../types/marketplace';

interface ProductCardProps {
  listing: MarketplaceListing;
  compact?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ listing, compact = false }) => {
  const navigate = useNavigate();
  const { addListing } = useCart();
  const { has, toggle } = useWishlist();
  const wished = has(listing.id);
  const price = getProductPrice(listing);
  const quantity = listing.quantity ?? listing.stock_count;
  const canAdd = price !== null && quantity !== 0;

  return (
    <article className="product-card group relative flex h-full flex-col">
      <Link to={`/marketplace/${listing.id}`} className="relative block overflow-hidden">
        <div className={compact ? 'aspect-square' : 'aspect-[4/5]'}>
          {getProductImage(listing) ? (
            <img src={getProductImage(listing) || ''} alt={getProductTitle(listing)} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-end bg-sand p-4">
              <p className="font-display text-xl text-stone-700">{listing.category || 'Handmade'}</p>
            </div>
          )}
        </div>
      </Link>
      <button
        type="button"
        aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
        onClick={() => toggle(listing)}
        className={`wish-btn absolute right-3 top-3 ${wished ? 'is-active' : ''}`}
      >
        <Heart className={`h-4 w-4 ${wished ? 'fill-terracotta' : ''}`} strokeWidth={1.75} />
      </button>
      <div className="flex flex-1 flex-col gap-1.5 px-3 pb-3 pt-3">
        <Link to={`/marketplace/${listing.id}`} className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-charcoal">
            {getProductTitle(listing)}
          </h3>
        </Link>
        <p className="truncate text-xs text-stone-600">
          {listing.artisan?.id ? (
            <Link to={`/craftsman/${listing.artisan.id}`} className="hover:text-terracotta">
              {listing.artisan.full_name || 'Independent artisan'}
            </Link>
          ) : (
            listing.artisan?.full_name || 'Independent artisan'
          )}
        </p>
        {listing.artisan?.location_state && (
          <p className="flex items-center gap-1 text-xs text-stone-500">
            <MapPin className="h-3 w-3" strokeWidth={1.75} />
            {listing.artisan.location_state}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <p className="text-base font-bold text-terracotta sm:text-lg">
            {price !== null ? `₹${price.toLocaleString('en-IN')}` : 'On request'}
          </p>
          {canAdd ? (
            <button
              type="button"
              onClick={() => addListing(listing, 1)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-terracotta px-3 text-xs font-semibold text-cream transition hover:bg-terracotta-dark"
            >
              <ShoppingBag className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span className="hidden sm:inline">Add to Cart</span>
            </button>
          ) : (
            <button type="button" onClick={() => navigate(`/marketplace/${listing.id}`)} className="text-xs font-semibold text-indigo">
              View
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
