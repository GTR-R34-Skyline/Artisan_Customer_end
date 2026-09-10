import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Heart, MapPin, Minus, Plus } from 'lucide-react';
import { ProductReviews } from '../components/ProductReviews';
import { Button, EmptyState, Eyebrow, ImageFrame, LoadingState, StatusLabel } from '../components/DesignSystem';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { getMarketplaceListing } from '../services/marketplace.service';
import { getProductDescription, getProductImage, getProductPrice, getProductTitle, MarketplaceListing, MarketplaceProduct } from '../types/marketplace';

const listingGallery = (listing: MarketplaceProduct) =>
  Array.from(new Set([listing.studio_image_url, listing.enhanced_image_url, listing.original_image_url].filter((value): value is string => Boolean(value))));

const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { addListing } = useCart();
  const { has, toggle } = useWishlist();
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);
  const [quantityToAdd, setQuantityToAdd] = useState(1);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;
    getMarketplaceListing(productId)
      .then((next) => {
        setListing(next);
        setActiveImage(next ? getProductImage(next) : null);
      })
      .catch(() => setError('This work could not be loaded.'))
      .finally(() => setLoading(false));
  }, [productId]);

  if (loading) {
    return <div className="mx-auto max-w-market px-4 py-16 lg:px-8"><LoadingState label="Opening the work" /></div>;
  }

  if (error || !listing) {
    return <div className="mx-auto max-w-market px-4 py-16 lg:px-8"><EmptyState title="Work not found." description={error || 'This piece may no longer be available.'} /></div>;
  }

  const artisan = listing.artisan;
  const price = getProductPrice(listing);
  const stock = listing.quantity ?? listing.stock_count;
  const wished = has(listing.id);
  const canBuy = price !== null && stock !== 0;
  const maxQty = Math.max(1, stock || 1);

  const addToCart = (goToCheckout = false) => {
    addListing(listing, quantityToAdd);
    setAdded(true);
    if (goToCheckout) navigate('/checkout');
  };

  return (
    <div className="product-detail-page mx-auto max-w-market px-4 pb-20 pt-6 lg:px-8 lg:pt-8">
      <p className="mb-6 text-sm text-stone-500">
        <Link to="/" className="hover:text-terracotta">Home</Link>
        <span className="mx-2">/</span>
        <Link to="/marketplace" className="hover:text-terracotta">Marketplace</Link>
        {listing.category && (
          <>
            <span className="mx-2">/</span>
            <Link to={`/marketplace?category=${encodeURIComponent(listing.category)}`} className="hover:text-terracotta">{listing.category}</Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-charcoal">{getProductTitle(listing)}</span>
      </p>

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr_0.7fr] lg:gap-8">
        {(() => {
          const gallery = listingGallery(listing);
          const current = activeImage || gallery[0] || getProductImage(listing);
          return (
            <div className="flex gap-3">
              {gallery.length > 1 && (
                <div className="hidden w-16 shrink-0 flex-col gap-2 sm:flex">
                  {gallery.map((src) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setActiveImage(src)}
                      className={`product-thumb aspect-square ${current === src ? 'is-active' : ''}`}
                      aria-label="View product photo"
                    >
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <ImageFrame src={current} alt={getProductTitle(listing)} label={listing.category || 'Handmade work'} className="min-w-0 flex-1 aspect-square sm:aspect-[4/3] lg:aspect-[5/4]" />
            </div>
          );
        })()}

        <article>
          <Eyebrow>{listing.category || 'Handmade work'}</Eyebrow>
          <h1 className="mt-3 font-display text-4xl leading-[1.08] tracking-[-0.03em] text-charcoal sm:text-5xl">{getProductTitle(listing)}</h1>
          {artisan?.id && (
            <p className="mt-3 text-sm text-stone-600">
              Handcrafted by <Link to={`/craftsman/${artisan.id}`} className="font-semibold text-charcoal hover:text-terracotta">{artisan.full_name || 'an independent artisan'}</Link>
              {artisan.location_state ? ` · ${artisan.location_state}` : ''}
            </p>
          )}
          <p className="mt-5 text-sm leading-7 text-stone-700">{getProductDescription(listing)}</p>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <p className="font-display text-4xl text-terracotta">{price !== null ? `₹${price.toLocaleString('en-IN')}` : 'Price on request'}</p>
            <StatusLabel tone={stock === 0 ? 'warning' : 'success'}>{stock === 0 ? 'Unavailable' : 'Available'}</StatusLabel>
          </div>

          {listing.material && (
            <p className="mt-4 text-sm text-stone-600"><span className="font-semibold text-charcoal">Material:</span> {listing.material}</p>
          )}

          {canBuy && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center rounded-full border border-stone-300 bg-cream">
                <button type="button" aria-label="Decrease quantity" onClick={() => setQuantityToAdd((value) => Math.max(1, value - 1))} className="p-3">
                  <Minus className="h-4 w-4" strokeWidth={1.75} />
                </button>
                <span className="min-w-8 text-center text-sm font-semibold">{quantityToAdd}</span>
                <button type="button" aria-label="Increase quantity" onClick={() => setQuantityToAdd((value) => Math.min(maxQty, value + 1))} className="p-3">
                  <Plus className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
              <Button onClick={() => addToCart(false)}>{added ? 'Added to cart' : 'Add to Cart'}</Button>
              <Button variant="light" onClick={() => addToCart(true)}>Buy Now</Button>
              <button type="button" onClick={() => toggle(listing)} className="header-icon inline-flex" aria-label="Save">
                <Heart className={`h-5 w-5 ${wished ? 'fill-terracotta text-terracotta' : ''}`} strokeWidth={1.75} />
              </button>
            </div>
          )}
        </article>

        {artisan?.id && (
          <aside className="panel h-fit p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">About the Artisan</p>
            <p className="mt-3 font-display text-2xl text-charcoal">{artisan.full_name || 'Independent artisan'}</p>
            {artisan.location_state && (
              <p className="mt-2 inline-flex items-center gap-1 text-sm text-stone-600">
                <MapPin className="h-4 w-4" strokeWidth={1.75} />
                {artisan.location_state}
              </p>
            )}
            <p className="mt-4 text-sm leading-6 text-stone-600">
              {artisan.location_state
                ? `Working from ${artisan.location_state}, this piece is part of an independent practice represented through ARTISAN.`
                : 'This piece is part of an independent practice represented through ARTISAN.'}
            </p>
            <Link to={`/craftsman/${artisan.id}`} className="mt-5 inline-flex text-sm font-semibold text-terracotta">
              View More Products
            </Link>
          </aside>
        )}
      </div>

      <ProductReviews productId={listing.id} vendorId={listing.vendor_id} />
    </div>
  );
};

export default ProductDetailPage;
