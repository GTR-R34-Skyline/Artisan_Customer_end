import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState, Eyebrow, LoadingState, Reveal } from '../components/DesignSystem';
import { ProductCard } from '../components/ProductCard';
import { getMarketplaceListings } from '../services/marketplace.service';
import { getProductPrice, getProductTitle, MarketplaceListing } from '../types/marketplace';

type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'newest';

const MarketplacePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sort, setSort] = useState<SortOption>('featured');

  const search = searchParams.get('q') || '';
  const category = searchParams.get('category') || 'All categories';
  const region = searchParams.get('region') || 'All regions';

  useEffect(() => {
    getMarketplaceListings()
      .then(setListings)
      .catch(() => setError('The collection could not be loaded. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(
    () => ['All categories', ...Array.from(new Set(listings.map((listing) => listing.category).filter((value): value is string => Boolean(value))))],
    [listings],
  );
  const regions = useMemo(
    () => ['All regions', ...Array.from(new Set(listings.map((listing) => listing.artisan?.location_state).filter((value): value is string => Boolean(value))))],
    [listings],
  );

  const filteredListings = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();
    const next = listings.filter((listing) => {
      const matchesSearch = !normalizedSearch || [getProductTitle(listing), listing.artisan?.full_name, listing.category, listing.material]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch);
      const matchesCategory = category === 'All categories' || listing.category === category;
      const matchesRegion = region === 'All regions' || listing.artisan?.location_state === region;
      return matchesSearch && matchesCategory && matchesRegion;
    });

    return next.sort((a, b) => {
      if (sort === 'price-asc') return (getProductPrice(a) ?? Number.MAX_SAFE_INTEGER) - (getProductPrice(b) ?? Number.MAX_SAFE_INTEGER);
      if (sort === 'price-desc') return (getProductPrice(b) ?? 0) - (getProductPrice(a) ?? 0);
      if (sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return 0;
    });
  }, [category, listings, region, search, sort]);

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'All categories' || value === 'All regions') next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
  };

  return (
    <div className="marketplace-page mx-auto max-w-market px-4 pb-20 pt-8 lg:px-8 lg:pt-12">
      <header className="max-w-2xl space-y-3">
        <Eyebrow>The collection</Eyebrow>
        <h1 className="font-display text-3xl tracking-[-0.03em] text-charcoal sm:text-5xl">Handmade from across India.</h1>
        <p className="text-sm leading-7 text-stone-600">
          Pottery, handloom, jewellery, and regional crafts from independent makers. Every piece begins with material, place, and time.
        </p>
      </header>

      <div className="filter-bar mt-6 flex flex-col gap-3 border-y border-stone-300 py-4 lg:flex-row lg:items-center">
        <label className="market-search flex lg:max-w-sm">
          <span className="sr-only">Search</span>
          <input
            value={search}
            onChange={(event) => updateFilter('q', event.target.value)}
            placeholder="Name, maker, material"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-500"
          />
        </label>
        <div className="flex flex-1 flex-wrap gap-3">
          <label className="flex min-w-[9rem] flex-1 items-center gap-2 rounded-full border border-stone-300 bg-cream px-3 py-2 text-xs font-medium text-stone-600">
            Craft
            <select value={category} onChange={(event) => updateFilter('category', event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-charcoal outline-none">
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="flex min-w-[9rem] flex-1 items-center gap-2 rounded-full border border-stone-300 bg-cream px-3 py-2 text-xs font-medium text-stone-600">
            Region
            <select value={region} onChange={(event) => updateFilter('region', event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-charcoal outline-none">
              {regions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="flex min-w-[9rem] items-center gap-2 rounded-full border border-stone-300 bg-cream px-3 py-2 text-xs font-medium text-stone-600">
            Sort
            <select value={sort} onChange={(event) => setSort(event.target.value as SortOption)} className="bg-transparent text-sm text-charcoal outline-none">
              <option value="featured">Featured</option>
              <option value="newest">Newest</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </label>
        </div>
      </div>

      {error && <p className="py-5 text-sm text-terracotta-dark">{error}</p>}
      {loading ? (
        <LoadingState label="Gathering the collection" />
      ) : filteredListings.length > 0 ? (
        <>
          <p className="pt-6 text-sm text-stone-600">{filteredListings.length} {filteredListings.length === 1 ? 'piece' : 'pieces'}</p>
          <div className="grid grid-cols-2 gap-3 pt-4 sm:gap-5 lg:grid-cols-4">
            {filteredListings.map((listing, index) => (
              <Reveal key={listing.id} delay={`${Math.min(index, 7) * 50}ms`}>
                <ProductCard listing={listing} compact />
              </Reveal>
            ))}
          </div>
        </>
      ) : (
        <div className="pt-10">
          <EmptyState title={listings.length ? 'No work matches these filters.' : 'The collection is being assembled.'} description={listings.length ? 'Try another search, craft, or region.' : 'Published work will appear here as artisans bring their pieces online.'} />
        </div>
      )}
    </div>
  );
};

export default MarketplacePage;
