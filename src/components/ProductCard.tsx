import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { getProductImage, getProductPrice, getProductTitle, MarketplaceListing } from '../types/marketplace';
import { getArtisanName, productAlt, formatINR } from '../utils/marketplace';
import { shopCategoryLabel } from '../utils/shopCategories';

interface ProductCardProps {
  listing: MarketplaceListing;
  compact?: boolean;
  priority?: boolean;
}

const ProductRating: React.FC<{ rating: number; reviewCount?: number | null }> = ({ rating, reviewCount }) => {
  const clamped = Math.max(0, Math.min(5, rating));
  return (
    <div className="product-card-rating mt-1.5 flex min-w-0 items-center gap-1" aria-label={`Rated ${clamped.toFixed(1)} out of 5`}>
      <div className="flex items-center gap-0.5" aria-hidden>
        {[1, 2, 3, 4, 5].map((star) => {
          const fill = Math.max(0, Math.min(1, clamped - (star - 1)));
          return (
            <span key={star} className="relative inline-flex h-3 w-3 shrink-0">
              <Star className="absolute inset-0 h-3 w-3 text-stone-300" strokeWidth={1.5} />
              {fill > 0 && (
                <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                  <Star className="h-3 w-3 fill-gold text-gold" strokeWidth={1.5} />
                </span>
              )}
            </span>
          );
        })}
      </div>
      <span className="text-[11px] tabular-nums text-stone-600">{clamped.toFixed(1)}</span>
      {typeof reviewCount === 'number' && reviewCount > 0 && (
        <span className="truncate text-[11px] text-stone-400">({reviewCount})</span>
      )}
    </div>
  );
};

export const ProductCard: React.FC<ProductCardProps> = ({ listing, compact = false, priority = false }) => {
  const navigate = useNavigate();
  const { addListing } = useCart();
  const { has, toggle } = useWishlist();
  const [added, setAdded] = useState(false);
  const wished = has(listing.id);
  const price = getProductPrice(listing);
  const quantity = listing.quantity ?? listing.stock_count;
  const outOfStock = quantity === 0;
  const canAdd = price !== null && !outOfStock;
  const maker = getArtisanName(listing);
  const image = getProductImage(listing);
  const title = getProductTitle(listing);
  const shopLabel = shopCategoryLabel(listing.category);
  const badge = listing.badge || null;
  const rating = listing.rating ?? null;
  const reviewCount = listing.reviewCount ?? null;

  useEffect(() => {
    if (!added) return undefined;
    const timer = window.setTimeout(() => setAdded(false), 1400);
    return () => window.clearTimeout(timer);
  }, [added]);

  return (
    <article className={`product-card group relative flex h-full min-w-0 flex-col ${compact ? 'is-compact' : ''}`}>
      <Link to={`/marketplace/${listing.id}`} className="relative block min-w-0 overflow-hidden bg-sand">
        <div className="aspect-[4/5]">
          {image ? (
            <img
              src={image}
              alt={productAlt(listing)}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              width={480}
              height={600}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-end bg-sand p-3 sm:p-4">
              <p className="font-display text-lg leading-tight text-stone-700 sm:text-xl">{shopLabel}</p>
            </div>
          )}
        </div>
        {badge === 'bestseller' && !outOfStock && (
          <span className="product-badge product-badge-bestseller" aria-hidden="true">Bestseller</span>
        )}
        {badge === 'trending' && !outOfStock && (
          <span className="product-badge product-badge-trending" aria-hidden="true">Trending</span>
        )}
        {outOfStock && (
          <span className="absolute left-2 top-2 rounded-sm bg-charcoal/85 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-cream">
            Out of stock
          </span>
        )}
        {added && <span className="toast-inline" role="status">Added to Cart</span>}
      </Link>
      <button
        type="button"
        aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
        aria-pressed={wished}
        onClick={() => toggle(listing)}
        className={`wish-btn absolute right-2 top-2 ${wished ? 'is-active' : ''}`}
      >
        <Heart className={`h-4 w-4 ${wished ? 'fill-terracotta' : ''}`} strokeWidth={1.75} />
      </button>
      <div className="product-card-body flex min-w-0 flex-1 flex-col">
        <Link to={`/marketplace/${listing.id}`} className="min-w-0">
          <h3 className="line-clamp-2 break-words text-[0.92rem] font-semibold leading-snug tracking-[-0.01em] text-charcoal sm:text-[0.98rem]">
            {title}
          </h3>
        </Link>
        {maker && (
          <p className="mt-1 line-clamp-1 text-[12px] text-stone-600">
            {listing.artisan?.id ? (
              <Link to={`/craftsman/${listing.artisan.id}`} className="hover:text-royal">
                By {maker}
              </Link>
            ) : (
              `By ${maker}`
            )}
          </p>
        )}
        <p className="mt-0.5 line-clamp-1 text-[11px] text-stone-500">{shopLabel}</p>
        {rating !== null && rating > 0 && (
          <ProductRating rating={rating} reviewCount={reviewCount} />
        )}
        <div className="mt-auto pt-2">
          <p className="product-price text-[1.05rem] font-bold tabular-nums text-charcoal">
            {price !== null ? formatINR(price) : 'On request'}
          </p>
          {canAdd ? (
            <button
              type="button"
              onClick={() => {
                addListing(listing, 1);
                setAdded(true);
              }}
              className={`product-card-atc ${added ? 'is-added' : ''}`}
              aria-label={added ? `${title} added to cart` : `Add ${title} to cart`}
            >
              <ShoppingBag className="h-3.5 w-3.5" strokeWidth={1.75} />
              {added ? 'Added' : 'Add to Cart'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate(`/marketplace/${listing.id}`)}
              className="product-card-atc"
              style={{ background: '#123c35' }}
            >
              {outOfStock ? 'View details' : 'View'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
