import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Heart, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { getProductImage, getProductPrice, getProductTitle, MarketplaceListing } from '../types/marketplace';
import { getArtisanLocation, getArtisanName, metaLine, productAlt, formatINR } from '../utils/marketplace';

interface ProductCardProps {
  listing: MarketplaceListing;
  compact?: boolean;
  priority?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ listing, compact = false, priority = false }) => {
  const navigate = useNavigate();
  const { addListing } = useCart();
  const { has, toggle } = useWishlist();
  const [added, setAdded] = useState(false);
  const wished = has(listing.id);
  const price = getProductPrice(listing);
  const quantity = listing.quantity ?? listing.stock_count;
  const canAdd = price !== null && quantity !== 0;
  const location = getArtisanLocation(listing);
  const maker = getArtisanName(listing);
  const details = metaLine(listing);
  const image = getProductImage(listing);
  const title = getProductTitle(listing);

  useEffect(() => {
    if (!added) return undefined;
    const timer = window.setTimeout(() => setAdded(false), 1400);
    return () => window.clearTimeout(timer);
  }, [added]);

  return (
    <article className="product-card group relative flex h-full flex-col">
      <Link to={`/marketplace/${listing.id}`} className="relative block overflow-hidden bg-sand">
        <div className={compact ? 'aspect-[4/5]' : 'aspect-[4/5]'}>
          {image ? (
            <img
              src={image}
              alt={productAlt(listing)}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              className="h-full w-full object-cover"
            />
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
        aria-pressed={wished}
        onClick={() => toggle(listing)}
        className={`wish-btn absolute right-2.5 top-2.5 ${wished ? 'is-active' : ''}`}
      >
        <Heart className={`h-4 w-4 ${wished ? 'fill-terracotta' : ''}`} strokeWidth={1.75} />
      </button>
      <div className="flex flex-1 flex-col gap-1 px-0 pb-1 pt-3">
        <Link to={`/marketplace/${listing.id}`} className="min-w-0">
          <h3 className="line-clamp-2 font-display text-[1.05rem] leading-snug tracking-[-0.02em] text-charcoal">
            {title}
          </h3>
        </Link>
        {location && <p className="text-[12px] leading-5 text-stone-600">{location}</p>}
        {details && <p className="line-clamp-1 text-[12px] leading-5 text-stone-500">{details}</p>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="min-w-0">
            <p className="text-[0.95rem] font-semibold tabular-nums text-charcoal sm:text-base">
              {price !== null ? formatINR(price) : 'On request'}
            </p>
            {maker && (
              <p className="mt-0.5 truncate text-[11px] text-stone-500">
                {listing.artisan?.id ? (
                  <Link to={`/craftsman/${listing.artisan.id}`} className="hover:text-indigo">
                    Made by {maker}
                  </Link>
                ) : (
                  `Made by ${maker}`
                )}
              </p>
            )}
          </div>
          {canAdd ? (
            <button
              type="button"
              onClick={() => {
                addListing(listing, 1);
                setAdded(true);
              }}
              className="inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-md bg-charcoal px-2.5 text-cream transition hover:bg-indigo"
              aria-label={added ? `${title} added to cart` : `Add ${title} to cart`}
            >
              {added ? <Check className="h-4 w-4" strokeWidth={2} /> : <ShoppingBag className="h-3.5 w-3.5" strokeWidth={1.75} />}
              <span className="hidden text-[11px] font-semibold sm:inline">{added ? 'Added' : 'Add'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate(`/marketplace/${listing.id}`)}
              className="text-xs font-semibold text-indigo"
            >
              View
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
