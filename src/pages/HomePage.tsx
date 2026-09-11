import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { ArrowButton, ProductSkeleton, Reveal, SectionHeading } from '../components/DesignSystem';
import { ProductCard } from '../components/ProductCard';
import { ArtisanCard } from '../components/marketplace/ArtisanCard';
import { getMarketplaceListings } from '../services/marketplace.service';
import { getProductImage, MarketplaceListing } from '../types/marketplace';
import {
  craftNotesForCatalog,
  listingsByCategory,
  listingsByRegion,
  pickFeaturedListings,
  SEARCH_PLACEHOLDER,
  uniqueArtisans,
  uniqueValues,
} from '../utils/marketplace';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    getMarketplaceListings()
      .then(setListings)
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => listingsByCategory(listings), [listings]);
  const regions = useMemo(() => listingsByRegion(listings), [listings]);
  const featured = useMemo(() => pickFeaturedListings(listings, 8), [listings]);
  const makers = useMemo(() => uniqueArtisans(listings).slice(0, 4), [listings]);
  const crafts = useMemo(() => craftNotesForCatalog(listings), [listings]);
  const materials = useMemo(() => uniqueValues(listings, (listing) => listing.material).slice(0, 4), [listings]);
  const heroImages = useMemo(
    () => featured.map(getProductImage).filter((value): value is string => Boolean(value)).slice(0, 3),
    [featured],
  );

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const next = query.trim();
    navigate(next ? `/marketplace?q=${encodeURIComponent(next)}` : '/marketplace');
  };

  const suggestions = [
    ...categories.slice(0, 3).map((item) => ({ label: item.name, to: `/marketplace?category=${encodeURIComponent(item.name)}` })),
    ...regions.slice(0, 2).map((item) => ({ label: item.name, to: `/marketplace?region=${encodeURIComponent(item.name)}` })),
    ...materials.map((item) => ({ label: item, to: `/marketplace?material=${encodeURIComponent(item)}` })),
  ].slice(0, 6);

  return (
    <div className="home-page">
      <section className="mx-auto max-w-market px-4 pt-6 lg:px-8 lg:pt-10">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo">India’s artisan marketplace</p>
            <h1 className="hero-title mt-4 max-w-xl font-display text-[2.35rem] leading-[1.08] tracking-[-0.035em] text-charcoal sm:text-5xl lg:text-[3.4rem]">
              India’s modern marketplace for authentic artisan-made products.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-stone-600 sm:text-base">
              Shop pottery, textiles, jewellery, woodcraft, and regional crafts — made by independent artisans, found by craft, material, and place.
            </p>
            <form onSubmit={submitSearch} className="market-search mt-7 max-w-xl">
              <Search className="h-4 w-4 shrink-0 text-stone-500" strokeWidth={1.75} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={SEARCH_PLACEHOLDER}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-500"
                aria-label="Search the marketplace"
              />
              <button type="submit" className="market-search-submit !w-auto !rounded-md px-4 text-xs font-semibold">
                Search
              </button>
            </form>
            {suggestions.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {suggestions.map((item) => (
                  <Link key={item.to + item.label} to={item.to} className="suggestion-chip">
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
            <div className="mt-7 flex flex-wrap gap-3">
              <ArrowButton to="/marketplace">Shop the collection</ArrowButton>
              {makers.length > 0 && (
                <a href="#makers" className="button-light inline-flex min-h-11 items-center rounded-md px-5 text-sm font-semibold">
                  Meet the artisans
                </a>
              )}
            </div>
          </div>

          <div className="hero-gallery">
            {heroImages.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="image-frame aspect-[4/5]">
                  <img src={heroImages[0]} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="grid gap-3 sm:gap-4">
                  <div className="image-frame aspect-[5/4]">
                    <img src={heroImages[1] || heroImages[0]} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="image-frame aspect-[5/4]">
                    <img src={heroImages[2] || heroImages[0]} alt="" className="h-full w-full object-cover" />
                  </div>
                </div>
              </div>
            ) : loading ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="skeleton-block aspect-[4/5]" />
                <div className="grid gap-3">
                  <div className="skeleton-block aspect-[5/4]" />
                  <div className="skeleton-block aspect-[5/4]" />
                </div>
              </div>
            ) : (
              <div className="flex aspect-[4/3] items-end bg-sand p-8">
                <p className="font-display text-3xl leading-tight text-stone-700">Handmade work from across India.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section id="categories" className="mx-auto max-w-market px-4 py-14 lg:px-8 lg:py-20">
          <SectionHeading
            eyebrow="Shop by category"
            title="Find a craft."
            description="Browse the collection the way it is made — by the work itself."
            action={<Link to="/marketplace" className="text-sm font-semibold text-indigo">View all</Link>}
          />
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {categories.map((category) => {
              const image = getProductImage(category.items[0]);
              return (
                <Link key={category.name} to={`/marketplace?category=${encodeURIComponent(category.name)}`} className="category-card">
                  <div className="aspect-[5/4] overflow-hidden bg-sand">
                    {image ? (
                      <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <div className="flex h-full items-end p-4">
                        <span className="font-display text-xl">{category.name}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-baseline justify-between gap-3 px-3 py-3">
                    <p className="font-medium text-charcoal">{category.name}</p>
                    <p className="text-xs text-stone-500">{category.count}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {regions.length > 0 && (
        <section id="regions" className="bg-cream py-14 lg:py-20">
          <div className="mx-auto max-w-market px-4 lg:px-8">
            <SectionHeading
              eyebrow="Explore India through its crafts"
              title="Shop by region."
              description="Every piece carries a place. Discover the collection by the state it comes from."
            />
            <div className="mt-8 flex gap-4 overflow-x-auto pb-2 hide-scrollbar sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-5">
              {regions.map((region) => {
                const image = getProductImage(region.items[0]);
                return (
                  <Link key={region.name} to={`/marketplace?region=${encodeURIComponent(region.name)}`} className="region-card w-[11.5rem] shrink-0 sm:w-auto">
                    <div className="aspect-[4/3] overflow-hidden bg-sand">
                      {image ? <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" /> : null}
                    </div>
                    <div className="px-3 py-3">
                      <p className="font-display text-xl text-charcoal">{region.name}</p>
                      <p className="mt-0.5 text-xs text-stone-500">{region.count} {region.count === 1 ? 'piece' : 'pieces'}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-market px-4 py-14 lg:px-8 lg:py-20">
        <SectionHeading
          eyebrow="The collection"
          title="Featured pieces."
          description="A cross-section of the marketplace — real work from independent makers."
          action={(
            <Link to="/marketplace" className="inline-flex items-center gap-1 text-sm font-semibold text-indigo">
              Shop all <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
            </Link>
          )}
        />
        {loading ? (
          <div className="mt-8"><ProductSkeleton count={8} /></div>
        ) : featured.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {featured.map((listing, index) => (
              <Reveal key={listing.id} delay={`${Math.min(index, 6) * 40}ms`}>
                <ProductCard listing={listing} compact priority={index < 4} />
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="mt-8 border border-dashed border-stone-300 bg-cream px-5 py-12 text-sm text-stone-600">
            Published work will appear here as the collection grows.
          </p>
        )}
      </section>

      {makers.length > 0 && (
        <section id="makers" className="bg-cream py-14 lg:py-20">
          <div className="mx-auto max-w-market px-4 lg:px-8">
            <SectionHeading
              eyebrow="The makers"
              title="Discover artisans."
              description="You are not only buying a product. You are meeting the person and craft behind it."
            />
            <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {makers.map((listing) => (
                <ArtisanCard key={listing.artisan?.id} listing={listing} />
              ))}
            </div>
          </div>
        </section>
      )}

      {crafts.length > 0 && (
        <section className="mx-auto max-w-market px-4 py-14 pb-20 lg:px-8 lg:py-20 lg:pb-24">
          <SectionHeading
            eyebrow="Crafts of India"
            title="Traditions, still being made."
            description="A short guide to the crafts currently in the collection — so you know what you are looking at."
          />
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {crafts.map((craft) => (
              <Link key={craft.name} to={`/marketplace?category=${encodeURIComponent(craft.name)}`} className="craft-note">
                <p className="font-display text-2xl text-charcoal">{craft.name}</p>
                <p className="mt-3 text-sm leading-7 text-stone-600">{craft.note}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-indigo">Shop {craft.name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default HomePage;
