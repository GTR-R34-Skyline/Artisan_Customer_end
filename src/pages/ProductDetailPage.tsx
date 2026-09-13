import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Heart, Minus, Plus } from 'lucide-react';
import { ProductReviews } from '../components/ProductReviews';
import { Button, EmptyState, Eyebrow, LoadingState, ProductSkeleton, StatusLabel } from '../components/DesignSystem';
import { ProductCard } from '../components/ProductCard';
import { ProductGallery } from '../components/ProductGallery';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { getMarketplaceListing, getMarketplaceListings } from '../services/marketplace.service';
import {
  getProductDescription,
  getProductPrice,
  getProductStory,
  getProductTitle,
  MarketplaceListing,
  MarketplaceProduct,
} from '../types/marketplace';
import { formatINR, getArtisanLocation, getProductCraft, productAlt, relatedListings } from '../utils/marketplace';

const listingGallery = (listing: MarketplaceProduct) =>
  Array.from(new Set([listing.studio_image_url, listing.enhanced_image_url, listing.original_image_url].filter((value): value is string => Boolean(value))));

const RelatedRail: React.FC<{ title: string; listings: MarketplaceListing[] }> = ({ title, listings }) => {
  if (!listings.length) return null;
  return (
    <section className="mt-10 border-t border-stone-300 pt-8 md:mt-16 md:pt-10">
      <h2 className="font-display text-2xl tracking-[-0.03em] text-charcoal sm:text-3xl">{title}</h2>
      <div className="product-grid mt-5">
        {listings.map((listing) => (
          <ProductCard key={listing.id} listing={listing} compact />
        ))}
      </div>
    </section>
  );
};

const ProductDetailPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { addListing } = useCart();
  const { has, toggle } = useWishlist();
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [catalog, setCatalog] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);
  const [quantityToAdd, setQuantityToAdd] = useState(1);
  const [storyOpen, setStoryOpen] = useState(false);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    setError('');
    Promise.all([getMarketplaceListing(productId), getMarketplaceListings()])
      .then(([next, all]) => {
        setListing(next);
        setCatalog(all);
        setQuantityToAdd(1);
        setAdded(false);
        setStoryOpen(false);
      })
      .catch(() => setError('This work could not be loaded.'))
      .finally(() => setLoading(false));
  }, [productId]);

  const related = useMemo(() => (listing ? relatedListings(listing, catalog) : null), [catalog, listing]);

  if (loading) {
    return (
      <div className="mx-auto max-w-market px-4 py-16 lg:px-8">
        <LoadingState label="Opening the piece" />
        <div className="mt-10"><ProductSkeleton count={4} /></div>
      </div>
    );
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
  const craft = getProductCraft(listing);
  const location = getArtisanLocation(listing);
  const story = getProductStory(listing);
  const storyPreview = story && story.length > 280 && !storyOpen ? `${story.slice(0, 280).trim()}…` : story;

  const addToCart = (goToCheckout = false) => {
    addListing(listing, quantityToAdd);
    setAdded(true);
    if (goToCheckout) navigate('/checkout');
  };

  const facts = [
    artisan?.full_name ? { label: 'Made by', value: artisan.full_name, to: artisan.id ? `/craftsman/${artisan.id}` : undefined } : null,
    location ? { label: 'Location', value: location, to: `/marketplace?region=${encodeURIComponent(location)}` } : null,
    craft ? { label: 'Craft', value: craft, to: listing.category ? `/marketplace?category=${encodeURIComponent(listing.category)}` : undefined } : null,
    listing.material ? { label: 'Material', value: listing.material, to: `/marketplace?material=${encodeURIComponent(listing.material)}` } : null,
    listing.labour_days ? { label: 'Made over', value: `${listing.labour_days} ${listing.labour_days === 1 ? 'day' : 'days'}` } : null,
  ].filter((item): item is { label: string; value: string; to?: string } => Boolean(item));

  return (
    <div className={`product-detail-page mx-auto max-w-market pt-0 md:px-4 md:pb-20 md:pt-6 lg:px-8 lg:pt-8 ${canBuy ? 'has-pdp-buybar' : 'pb-10'}`}>
      <nav className="mb-4 hidden px-4 text-sm text-stone-500 md:mb-6 md:block md:px-0" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-indigo">Home</Link>
        <span className="mx-2">/</span>
        <Link to="/marketplace" className="hover:text-indigo">Marketplace</Link>
        {listing.category && (
          <>
            <span className="mx-2">/</span>
            <Link to={`/marketplace?category=${encodeURIComponent(listing.category)}`} className="hover:text-indigo">{listing.category}</Link>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-charcoal">{getProductTitle(listing)}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
        <ProductGallery
          images={listingGallery(listing)}
          alt={productAlt(listing)}
          fallbackLabel={listing.category || getProductTitle(listing)}
        />

        <article className="min-w-0 px-4 md:px-0">
          {craft && <Eyebrow>{craft}</Eyebrow>}
          <h1 className="mt-2 break-words font-display text-[1.85rem] leading-[1.12] tracking-[-0.03em] text-charcoal sm:text-5xl md:mt-3">
            {getProductTitle(listing)}
          </h1>
          {artisan?.id && (
            <p className="mt-2 text-sm text-stone-600 md:mt-3">
              Made by <Link to={`/craftsman/${artisan.id}`} className="font-semibold text-charcoal hover:text-royal">{artisan.full_name || 'an independent artisan'}</Link>
              {location ? ` · ${location}` : ''}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-end justify-between gap-3 md:mt-6 md:gap-4">
            <p className="font-display text-3xl text-charcoal sm:text-4xl">{price !== null ? formatINR(price) : 'Price on request'}</p>
            <StatusLabel tone={stock === 0 ? 'warning' : 'success'}>{stock === 0 ? 'Unavailable' : 'Available'}</StatusLabel>
          </div>

          {facts.length > 0 && (
            <dl className="mt-5 grid grid-cols-2 gap-2 md:mt-6 md:gap-3">
              {facts.map((fact) => (
                <div key={fact.label} className="min-w-0 bg-cream px-3 py-3 md:px-4">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">{fact.label}</dt>
                  <dd className="mt-1 truncate text-sm text-charcoal">
                    {fact.to ? <Link to={fact.to} className="hover:text-indigo">{fact.value}</Link> : fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {canBuy && (
            <div className="mt-6 hidden flex-wrap items-center gap-3 md:flex md:mt-8">
              <div className="inline-flex items-center rounded-md border border-stone-300 bg-cream">
                <button type="button" aria-label="Decrease quantity" onClick={() => setQuantityToAdd((value) => Math.max(1, value - 1))} className="min-h-11 min-w-11 p-3">
                  <Minus className="h-4 w-4" strokeWidth={1.75} />
                </button>
                <span className="min-w-8 text-center text-sm font-semibold">{quantityToAdd}</span>
                <button type="button" aria-label="Increase quantity" onClick={() => setQuantityToAdd((value) => Math.min(maxQty, value + 1))} className="min-h-11 min-w-11 p-3">
                  <Plus className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
              <Button onClick={() => addToCart(false)}>{added ? 'Added to Cart' : 'Add to Cart'}</Button>
              <Button variant="light" onClick={() => addToCart(true)}>Buy Now</Button>
              <button
                type="button"
                onClick={() => toggle(listing)}
                className="header-icon inline-flex"
                aria-label={wished ? 'Remove from wishlist' : 'Save to wishlist'}
                aria-pressed={wished}
              >
                <Heart className={`h-5 w-5 ${wished ? 'fill-terracotta text-terracotta' : ''}`} strokeWidth={1.75} />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => toggle(listing)}
            className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-charcoal md:hidden"
            aria-pressed={wished}
          >
            <Heart className={`h-5 w-5 ${wished ? 'fill-terracotta text-terracotta' : ''}`} strokeWidth={1.75} />
            {wished ? 'Saved to wishlist' : 'Save to wishlist'}
          </button>

          {artisan?.id && (
            <aside className="mt-8 border-t border-stone-300 pt-5 md:mt-10 md:pt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">The artisan</p>
              <p className="mt-2 font-display text-2xl text-charcoal">{artisan.full_name || 'Independent artisan'}</p>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {[artisan.craft_type || listing.category, location].filter(Boolean).join(' · ') || 'An independent practice represented through this marketplace.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {artisan.verification_status === 'verified' && <StatusLabel tone="success">Verified artisan</StatusLabel>}
                {artisan.gi_certified && <StatusLabel>GI-certified craft</StatusLabel>}
              </div>
              <Link to={`/craftsman/${artisan.id}`} className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-indigo">
                More from this artisan
              </Link>
            </aside>
          )}

          {story && (
            <div className="mt-6 md:mt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">The piece</p>
              <p className="mt-2 text-sm leading-7 text-stone-700">{storyPreview || getProductDescription(listing)}</p>
              {story.length > 280 && (
                <button type="button" onClick={() => setStoryOpen((open) => !open)} className="mt-2 min-h-11 text-sm font-semibold text-indigo">
                  {storyOpen ? 'Show less' : 'Read the full story'}
                </button>
              )}
            </div>
          )}
        </article>
      </div>

      <div className="px-4 md:px-0">
        <ProductReviews productId={listing.id} vendorId={listing.vendor_id} />

        {related && (() => {
          const shown = new Set<string>();
          const unseen = (items: MarketplaceListing[]) =>
            items.filter((item) => {
              if (shown.has(item.id)) return false;
              shown.add(item.id);
              return true;
            });
          return (
            <>
              <RelatedRail title="You may also like" listings={unseen(related.similar)} />
              {artisan?.full_name && <RelatedRail title={`More from ${artisan.full_name}`} listings={unseen(related.fromArtisan)} />}
              {listing.category && <RelatedRail title={`More ${listing.category}`} listings={unseen(related.fromCraft)} />}
              {location && <RelatedRail title={`More from ${location}`} listings={unseen(related.fromRegion)} />}
            </>
          );
        })()}
      </div>

      {canBuy && (
        <div className="pdp-buybar md:hidden">
          <div className="inline-flex items-center rounded-md border border-stone-300 bg-cream">
            <button type="button" aria-label="Decrease quantity" onClick={() => setQuantityToAdd((value) => Math.max(1, value - 1))} className="min-h-11 min-w-11">
              <Minus className="mx-auto h-4 w-4" strokeWidth={1.75} />
            </button>
            <span className="min-w-7 text-center text-sm font-semibold">{quantityToAdd}</span>
            <button type="button" aria-label="Increase quantity" onClick={() => setQuantityToAdd((value) => Math.min(maxQty, value + 1))} className="min-h-11 min-w-11">
              <Plus className="mx-auto h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
          <button type="button" onClick={() => addToCart(false)} className="button-dark min-h-12 flex-1 rounded-md px-3 text-sm font-semibold">
            {added ? 'Added' : 'Add to Cart'}
          </button>
          <button type="button" onClick={() => addToCart(true)} className="button-light min-h-12 flex-1 rounded-md px-3 text-sm font-semibold">
            Buy Now
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;
