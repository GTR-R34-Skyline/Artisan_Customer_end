import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import { EmptyState, Eyebrow, ProductSkeleton, Reveal } from '../components/DesignSystem';
import { ProductCard } from '../components/ProductCard';
import { FilterPanel, FilterSheet, FilterValues } from '../components/marketplace/FilterPanel';
import { getMarketplaceListings } from '../services/marketplace.service';
import { getProductPrice, MarketplaceListing } from '../types/marketplace';
import { filterListings, uniqueValues } from '../utils/marketplace';

type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'newest';

const MarketplacePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sort, setSort] = useState<SortOption>('featured');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const search = searchParams.get('q') || '';
  const values: FilterValues = {
    category: searchParams.get('category') || '',
    region: searchParams.get('region') || '',
    material: searchParams.get('material') || '',
    price: searchParams.get('price') || '',
  };

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    getMarketplaceListings()
      .then(setListings)
      .catch(() => setError('The collection could not be loaded. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => uniqueValues(listings, (listing) => listing.category), [listings]);
  const regions = useMemo(() => uniqueValues(listings, (listing) => listing.artisan?.location_state), [listings]);
  const materials = useMemo(() => uniqueValues(listings, (listing) => listing.material), [listings]);

  const filteredListings = useMemo(() => {
    const next = filterListings(listings, {
      search,
      category: values.category,
      region: values.region,
      material: values.material,
      price: values.price,
    });

    return next.sort((a, b) => {
      if (sort === 'price-asc') return (getProductPrice(a) ?? Number.MAX_SAFE_INTEGER) - (getProductPrice(b) ?? Number.MAX_SAFE_INTEGER);
      if (sort === 'price-desc') return (getProductPrice(b) ?? 0) - (getProductPrice(a) ?? 0);
      if (sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return 0;
    });
  }, [listings, search, sort, values.category, values.material, values.price, values.region]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value) next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
  };

  const updateFilter = (key: keyof FilterValues, value: string) => {
    updateParam(key === 'region' ? 'region' : key, value);
  };

  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    ['category', 'region', 'material', 'price'].forEach((key) => next.delete(key));
    setSearchParams(next);
  };

  const removeChip = (key: string) => {
    if (key === 'q') updateParam('q', '');
    else updateParam(key, '');
  };

  const chips = [
    search ? { key: 'q', label: `“${search}”` } : null,
    values.category ? { key: 'category', label: values.category } : null,
    values.region ? { key: 'region', label: values.region } : null,
    values.material ? { key: 'material', label: values.material } : null,
    values.price ? { key: 'price', label: values.price === '2500+' ? '₹2,500+' : `₹${values.price.replace('-', '–')}` } : null,
  ].filter((item): item is { key: string; label: string } => Boolean(item));

  const activeFilterCount = [values.category, values.region, values.material, values.price].filter(Boolean).length;
  const filterProps = {
    categories,
    regions,
    materials,
    values,
    onChange: updateFilter,
    onClear: clearFilters,
  };

  return (
    <div className="marketplace-page mx-auto max-w-market px-4 pb-20 pt-8 lg:px-8 lg:pt-10">
      <header className="max-w-2xl space-y-3">
        <Eyebrow>Marketplace</Eyebrow>
        <h1 className="font-display text-3xl tracking-[-0.03em] text-charcoal sm:text-5xl">Handmade from across India.</h1>
        <p className="text-sm leading-7 text-stone-600">
          Search by product, craft, material, or place. Every listing is a piece from an independent maker.
        </p>
      </header>

      <div className="mt-8 lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)] lg:items-start lg:gap-10">
        <aside className="panel sticky top-[6.5rem] hidden p-5 lg:block">
          <FilterPanel {...filterProps} />
        </aside>

        <div>
          <div className="flex flex-col gap-3 border-y border-stone-300 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="inline-flex min-h-11 items-center gap-2 rounded-md border border-stone-300 bg-cream px-3 text-sm font-semibold text-charcoal lg:hidden"
                onClick={() => setFiltersOpen(true)}
                aria-expanded={filtersOpen}
                aria-controls="mobile-filters-title"
              >
                <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-charcoal px-1.5 text-[10px] text-cream">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <p className="text-sm text-stone-600">
                {loading ? 'Gathering the collection' : `${filteredListings.length} ${filteredListings.length === 1 ? 'piece' : 'pieces'}`}
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs font-medium text-stone-600">
              Sort
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortOption)}
                className="min-h-11 rounded-md border border-stone-300 bg-cream px-3 text-sm text-charcoal outline-none"
              >
                <option value="featured">Featured</option>
                <option value="newest">Newest</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </select>
            </label>
          </div>

          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4">
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => removeChip(chip.key)}
                  className="inline-flex min-h-9 items-center gap-2 rounded-sm border border-stone-300 bg-cream px-3 text-xs font-medium text-charcoal"
                  aria-label={`Remove ${chip.label} filter`}
                >
                  {chip.label}
                  <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-8">
              <EmptyState title="The collection could not be loaded." description={error}>
                <button type="button" onClick={load} className="button-dark min-h-11 rounded-md px-5 text-sm font-semibold">
                  Try again
                </button>
              </EmptyState>
            </div>
          )}

          {loading ? (
            <div className="pt-6"><ProductSkeleton count={8} /></div>
          ) : !error && filteredListings.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 pt-6 sm:gap-5 md:grid-cols-3">
              {filteredListings.map((listing, index) => (
                <Reveal key={listing.id} delay={`${Math.min(index, 7) * 40}ms`}>
                  <ProductCard listing={listing} compact priority={index < 4} />
                </Reveal>
              ))}
            </div>
          ) : !error ? (
            <div className="pt-10">
              <EmptyState
                title={listings.length ? 'No work matches these filters.' : 'The collection is being assembled.'}
                description={listings.length ? 'Try another search, craft, state, or material.' : 'Published work will appear here as artisans bring their pieces online.'}
              >
                {listings.length > 0 && (
                  <button type="button" onClick={() => { clearFilters(); updateParam('q', ''); }} className="button-light min-h-11 rounded-md px-5 text-sm font-semibold">
                    Clear filters
                  </button>
                )}
              </EmptyState>
            </div>
          ) : null}
        </div>
      </div>

      <FilterSheet open={filtersOpen} onClose={() => setFiltersOpen(false)} {...filterProps} />
    </div>
  );
};

export default MarketplacePage;
