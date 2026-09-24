import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { ProductSkeleton, Reveal } from '../components/DesignSystem';
import { ProductCard } from '../components/ProductCard';
import { HeroCarousel } from '../components/home/HeroCarousel';
import { SectionCarousel } from '../components/home/SectionCarousel';
import { getMarketplaceListings } from '../services/marketplace.service';
import { MarketplaceListing } from '../types/marketplace';
import { useRefreshOnReconnect } from '../hooks/useOnlineStatus';
import { shopCategoryHref } from '../utils/shopCategories';
import {
  artisanTeasers,
  buildCollectionTiles,
  buildHeroSlides,
  enrichShopCategories,
  featuredListings,
  newestListings,
  trendingListings,
} from '../utils/homeDiscovery';

const HomeSection: React.FC<{
  id?: string;
  title: string;
  subtitle?: string;
  to?: string;
  actionLabel?: string;
  children: React.ReactNode;
  className?: string;
  flush?: boolean;
}> = ({ id, title, subtitle, to, actionLabel = 'View All', children, className = '', flush = false }) => (
  <section id={id} className={`home-section w-full min-w-0 ${flush ? '' : 'mx-auto max-w-market px-4 lg:px-8'} ${className}`}>
    <div className={`home-section-head min-w-0 ${flush ? 'mx-auto max-w-market px-4 lg:px-8' : ''}`}>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-[1.35rem] tracking-[-0.03em] text-charcoal sm:text-[1.65rem]">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-stone-600">{subtitle}</p>}
      </div>
      {to && (
        <Link to={to} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-royal">
          {actionLabel} <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
        </Link>
      )}
    </div>
    <div className={`min-w-0 ${flush ? 'mx-auto max-w-market px-4 lg:px-8' : ''}`}>{children}</div>
  </section>
);

const HomePage: React.FC = () => {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    getMarketplaceListings()
      .then(setListings)
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useRefreshOnReconnect(load);

  const heroSlides = useMemo(() => buildHeroSlides(listings), [listings]);
  const shopCategories = useMemo(() => enrichShopCategories(listings), [listings]);
  const collections = useMemo(() => buildCollectionTiles(shopCategories), [shopCategories]);
  const newest = useMemo(() => newestListings(listings, 20), [listings]);
  const featured = useMemo(() => featuredListings(listings, 8), [listings]);
  const trending = useMemo(() => {
    const exclude = new Set(newest.map((item) => item.id));
    return trendingListings(listings, exclude, 8);
  }, [listings, newest]);
  const makers = useMemo(() => artisanTeasers(listings, 12), [listings]);

  return (
    <div className="home-page flex w-full min-w-0 flex-col gap-0 overflow-x-hidden">
      {heroSlides.length > 0 ? (
        <HeroCarousel slides={heroSlides} />
      ) : loading ? (
        <div className="mx-auto w-full max-w-market px-4 pt-3 lg:px-8">
          <div className="skeleton-block min-h-[20rem] rounded-none sm:min-h-[24rem] lg:min-h-[28rem]" />
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-market px-4 py-3 lg:px-8">
        <div className="trust-bar">
          <span><Check className="check h-3.5 w-3.5" strokeWidth={2.5} /> Handmade</span>
          <span><Check className="check h-3.5 w-3.5" strokeWidth={2.5} /> Verified Artisans</span>
          <span><Check className="check h-3.5 w-3.5" strokeWidth={2.5} /> Secure Payments</span>
          <span><Check className="check h-3.5 w-3.5" strokeWidth={2.5} /> Pan-India Delivery</span>
        </div>
      </div>

      {shopCategories.length > 0 && (
        <HomeSection
          id="categories"
          title="Shop by Category"
          subtitle="Browse finished products from India’s artisans."
          to="/marketplace"
          className="py-5 md:py-7"
        >
          <div className="mt-4 min-w-0">
            <SectionCarousel
              prevLabel="Previous category"
              nextLabel="Next category"
              perView={{ mobile: 2, tablet: 3, desktop: 5 }}
              gapPx={14}
              autoPlay
              autoPlayIntervalMs={3600}
              transitionMs={700}
              infinite
              pauseOnHover
              showControls={false}
            >
              {shopCategories.map((category) => (
                <Link key={category.label} to={shopCategoryHref(category)} className="discover-tile block h-full">
                  <div className="discover-tile-media aspect-square">
                    {category.image ? (
                      <img src={category.image} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <div className="flex h-full items-end bg-sand p-3">
                        <span className="font-display text-lg text-stone-700">{category.label}</span>
                      </div>
                    )}
                    <div className="discover-tile-overlay">
                      <p className="truncate text-sm font-semibold text-ivory sm:text-[0.95rem]">{category.label}</p>
                      <p className="text-[11px] text-[rgba(243,234,204,0.75)]">{category.count}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </SectionCarousel>
          </div>
        </HomeSection>
      )}

      {collections.length > 0 && (
        <HomeSection
          id="collections"
          title="New Collections"
          subtitle="Curated from the crafts currently in the marketplace."
          to="/marketplace"
          className="py-5 md:py-7"
        >
          <div className="mt-4 min-w-0">
            <SectionCarousel
              prevLabel="Previous collection"
              nextLabel="Next collection"
              perView={{ mobile: 1, tablet: 2, desktop: 3 }}
              gapPx={14}
              autoPlay
              autoPlayIntervalMs={3600}
              transitionMs={700}
              infinite
              pauseOnHover
              showControls={false}
            >
              {collections.map((collection) => (
                <Link key={collection.id} to={collection.to} className="collection-tile block h-full">
                  <div className="collection-tile-media aspect-[16/11]">
                    {collection.image ? (
                      <img src={collection.image} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <div className="h-full bg-sand" />
                    )}
                    <div className="collection-tile-overlay">
                      <p className="font-display text-xl text-ivory sm:text-2xl">{collection.name}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[rgba(243,234,204,0.85)] sm:text-sm">{collection.blurb}</p>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-gold">Explore →</p>
                    </div>
                  </div>
                </Link>
              ))}
            </SectionCarousel>
          </div>
        </HomeSection>
      )}

      <HomeSection
        title="New Arrivals"
        subtitle="Fresh from our artisans."
        to="/marketplace?sort=newest"
        className="py-5 md:py-7"
      >
        {loading ? (
          <div className="mt-4"><ProductSkeleton count={8} /></div>
        ) : newest.length > 0 ? (
          <div className="mt-4 min-w-0">
            <SectionCarousel
              prevLabel="Previous product"
              nextLabel="Next product"
              perView={{ mobile: 2, tablet: 3, desktop: 5 }}
              gapPx={12}
              autoPlay
              autoPlayIntervalMs={3600}
              transitionMs={700}
              infinite
              pauseOnHover
              showControls={false}
            >
              {newest.map((listing, index) => (
                <div key={listing.id} className="product-card-compact h-full min-w-0">
                  <ProductCard listing={listing} compact priority={index < 5} />
                </div>
              ))}
            </SectionCarousel>
          </div>
        ) : (
          <p className="mt-5 border border-dashed border-stone-300 bg-cream px-5 py-8 text-sm text-stone-600">
            Published work will appear here as the collection grows.
          </p>
        )}
      </HomeSection>

      {featured.length > 0 && (
        <HomeSection
          title="Featured Picks"
          subtitle="A cross-section of the collection to explore next."
          to="/marketplace"
          className="bg-cream py-5 md:py-7"
          flush
        >
          <div className="product-grid product-grid-dense mt-4">
            {featured.map((listing, index) => (
              <Reveal key={listing.id} delay={`${Math.min(index, 5) * 30}ms`}>
                <ProductCard listing={listing} compact />
              </Reveal>
            ))}
          </div>
        </HomeSection>
      )}

      {trending.length > 0 && (
        <HomeSection
          title="Trending Now"
          subtitle="Pieces drawing attention across the marketplace."
          to="/marketplace"
          className="py-5 md:py-7"
        >
          <div className="product-rail mt-4 min-w-0 md:hidden">
            {trending.map((listing) => (
              <div key={listing.id} className="product-rail-item min-w-0">
                <ProductCard listing={listing} compact />
              </div>
            ))}
          </div>
          <div className="product-grid product-grid-dense mt-4 hidden md:grid">
            {trending.map((listing, index) => (
              <Reveal key={listing.id} delay={`${Math.min(index, 5) * 30}ms`}>
                <ProductCard listing={listing} compact />
              </Reveal>
            ))}
          </div>
        </HomeSection>
      )}

      {makers.length > 0 && (
        <HomeSection
          id="makers"
          title="Meet Our Artisans"
          subtitle="Photographs of the work — and the makers behind it."
          to="/artisans"
          className="bg-cream py-5 md:py-7"
          flush
        >
          <div className="mt-4 min-w-0">
            <SectionCarousel
              prevLabel="Previous artisan"
              nextLabel="Next artisan"
              perView={{ mobile: 1, tablet: 3, desktop: 4 }}
              gapPx={14}
              autoPlay
              autoPlayIntervalMs={3400}
              transitionMs={700}
              infinite
              pauseOnHover
              showControls={false}
            >
              {makers.map(({ listing, image }) => {
                const artisan = listing.artisan!;
                const name = artisan.full_name || 'Independent artisan';
                const craft = artisan.craft_type || listing.category;
                const isArtisanImage = Boolean(artisan.profile_image_url && image === artisan.profile_image_url);
                const imgAlt = isArtisanImage ? `Portrait of ${name}` : `Work by ${name}`;
                return (
                  <Link key={artisan.id} to={`/craftsman/${artisan.id}`} className="artisan-photo-card block h-full">
                    <div className="aspect-[4/5] overflow-hidden bg-sand">
                      {image ? (
                        <img src={image} alt={imgAlt} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                      ) : null}
                    </div>
                    <div className="p-3">
                      <p className="truncate font-semibold text-charcoal">{name}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">
                        {[artisan.location_state, craft].filter(Boolean).join(' · ')}
                      </p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-royal">Read Story →</p>
                    </div>
                  </Link>
                );
              })}
            </SectionCarousel>
          </div>
        </HomeSection>
      )}

      <section className="mx-auto w-full max-w-market px-4 pb-10 pt-1 lg:px-8">
        <div className="rounded-2xl bg-royal px-6 py-7 text-ivory md:px-10 md:py-8">
          <h2 className="font-display text-2xl tracking-[-0.03em] md:text-3xl">Why ARTISAN</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {['Verified Artisans', 'Authentic Handmade Products', 'Secure Payments', 'Pan-India Delivery'].map((item) => (
              <p key={item} className="inline-flex items-center gap-2 text-sm font-medium text-[rgba(243,234,204,0.9)]">
                <Check className="h-4 w-4 text-gold" strokeWidth={2.5} /> {item}
              </p>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
