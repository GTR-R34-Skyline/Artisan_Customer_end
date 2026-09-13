import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import { EmptyState, Eyebrow, ProductSkeleton, Reveal } from '../components/DesignSystem';
import { ProductCard } from '../components/ProductCard';
import { FilterPanel, FilterSheet, FilterValues, SortOption } from '../components/marketplace/FilterPanel';
import { getMarketplaceListings } from '../services/marketplace.service';
import { getProductPrice, MarketplaceListing } from '../types/marketplace';
import { useRefreshOnReconnect } from '../hooks/useOnlineStatus';
import { filterListings, uniqueValues } from '../utils/marketplace';
import { shopCategoryLabel } from '../utils/shopCategories';

const MarketplacePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const search = searchParams.get('q') || '';
  const sort = (searchParams.get('sort') as SortOption) || 'featured';
  const values: FilterValues = {
    category: searchParams.get('category') || '',
    region: searchParams.get('region') || '',
    craft: searchParams.get('craft') || '',
    material: searchParams.get('material') || '',
    price: searchParams.get('price') || '',
  };

  const load = useCallback((silent = false) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    getMarketplaceListings()
      .then(setListings)
      .catch(() => setError('The collection could not be loaded. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const reloadQuietly = useCallback(() => load(true), [load]);
  useRefreshOnReconnect(reloadQuietly);

  const categories = useMemo(() => uniqueValues(listings, (listing) => listing.category), [listings]);
  const regions = useMemo(() => uniqueValues(listings, (listing) => listing.artisan?.location_state), [listings]);
  const crafts = useMemo(() => uniqueValues(listings, (listing) => listing.artisan?.craft_type), [listings]);
  const materials = useMemo(() => uniqueValues(listings, (listing) => listing.material), [listings]);

  const filteredListings = useMemo(() => {
    const next = filterListings(listings, {
      search,
      category: values.category,
      region: values.region,
      craft: values.craft,
      material: values.material,
      price: values.price,
    });

    return next.sort((a, b) => {
      if (sort === 'price-asc') return (getProductPrice(a) ?? Number.MAX_SAFE_INTEGER) - (getProductPrice(b) ?? Number.MAX_SAFE_INTEGER);
      if (sort === 'price-desc') return (getProductPrice(b) ?? 0) - (getProductPrice(a) ?? 0);
      if (sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return 0;
    });
  }, [listings, search, sort, values.category, values.craft, values.material, values.price, values.region]);

  const regionCrafts = useMemo(() => {
    if (!values.region) return [];
    return uniqueValues(
      listings.filter((listing) => listing.artisan?.location_state === values.region),
      (listing) => listing.artisan?.craft_type || listing.category,
    );
  }, [listings, values.region]);

  const writeParams = (nextValues: FilterValues, nextSort: SortOption, nextSearch = search) => {
    const next = new URLSearchParams();
    if (nextSearch) next.set('q', nextSearch);
    if (nextValues.category) next.set('category', nextValues.category);
    if (nextValues.region) next.set('region', nextValues.region);
    if (nextValues.craft) next.set('craft', nextValues.craft);
    if (nextValues.material) next.set('material', nextValues.material);
    if (nextValues.price) next.set('price', nextValues.price);
    if (nextSort && nextSort !== 'featured') next.set('sort', nextSort);
    setSearchParams(next);
  };

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value) next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
  };

  const updateFilter = (key: keyof FilterValues, value: string) => {
    updateParam(key, value);
  };

  const clearFilters = () => {
    writeParams({ category: '', region: '', craft: '', material: '', price: '' }, sort, search);
  };

  const chips = [
    search ? { key: 'q', label: `“${search}”` } : null,
    values.category ? { key: 'category', label: shopCategoryLabel(values.category) } : null,
    values.region ? { key: 'region', label: values.region } : null,
    values.craft ? { key: 'craft', label: values.craft } : null,
    values.material ? { key: 'material', label: values.material } : null,
    values.price ? { key: 'price', label: values.price === '2500+' ? '₹2,500+' : `₹${values.price.replace('-', '–')}` } : null,
  ].filter((item): item is { key: string; label: string } => Boolean(item));

  const activeFilterCount = [values.category, values.region, values.craft, values.material, values.price].filter(Boolean).length;
  const filterProps = {
    categories,
    regions,
    crafts,
    materials,
    values,
    onChange: updateFilter,
    onClear: clearFilters,
  };

  return (
    <div className="marketplace-page mx-auto w-full min-w-0 max-w-market overflow-x-hidden px-4 pb-8 pt-5 md:pb-20 md:pt-8 lg:px-8 lg:pt-10">
      <header className="max-w-2xl space-y-2 md:space-y-3">
        <Eyebrow>Shop</Eyebrow>
        <h1 className="font-display text-[1.85rem] tracking-[-0.03em] text-charcoal sm:text-5xl">
          {values.region ? `Crafts from ${values.region}` : 'Discover handcrafted products from across India.'}
        </h1>
        <p className="hidden text-sm leading-7 text-stone-600 md:block">
          Shop finished products by category, craft, region, and artisan. Material is available as a filter — not the main way to browse.
        </p>
      </header>

      {values.region && regionCrafts.length > 0 && (
        <div className="mt-4 flex min-w-0 gap-2 overflow-x-auto pb-1 hide-scrollbar md:flex-wrap md:overflow-visible">
          {regionCrafts.map((craft) => (
            <Link
              key={craft}
              to={`/marketplace?region=${encodeURIComponent(values.region)}&${values.category === craft ? 'category' : 'craft'}=${encodeURIComponent(craft)}`}
              className={`category-chip ${values.craft === craft || values.category === craft ? 'is-active' : ''}`}
            >
              {craft}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-5 lg:mt-8 lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)] lg:items-start lg:gap-10">
        <aside className="panel sticky top-[6.5rem] hidden p-5 lg:block">
          <FilterPanel {...filterProps} />
        </aside>

        <div className="min-w-0">
          <div className="filter-toolbar">
            <button
              type="button"
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-stone-300 bg-cream px-3 text-sm font-semibold text-charcoal lg:hidden"
              onClick={() => setFiltersOpen(true)}
              aria-expanded={filtersOpen}
              aria-controls="mobile-filters-title"
            >
              <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} />
              Filter & Sort
              {activeFilterCount > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm bg-charcoal px-1.5 text-[10px] text-cream">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <p className="text-sm text-stone-600">
              {loading ? 'Gathering the collection' : `${filteredListings.length} ${filteredListings.length === 1 ? 'piece' : 'pieces'}`}
            </p>
            <label className="ml-auto hidden items-center gap-2 text-xs font-medium text-stone-600 lg:flex">
              Sort
              <select
                value={sort}
                onChange={(event) => updateParam('sort', event.target.value === 'featured' ? '' : event.target.value)}
                className="min-h-11 rounded-md border border-stone-300 bg-cream px-3 text-sm text-charcoal outline-none"
              >
                <option value="featured">Recommended</option>
                <option value="newest">Newest</option>
                <option value="price-asc">Price: Low → High</option>
                <option value="price-desc">Price: High → Low</option>
              </select>
            </label>
          </div>

          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4">
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => updateParam(chip.key, '')}
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
                <button type="button" onClick={() => load()} className="button-dark min-h-11 rounded-md px-5 text-sm font-semibold">
                  Try again
                </button>
              </EmptyState>
            </div>
          )}

          {loading ? (
            <div className="pt-6"><ProductSkeleton count={8} /></div>
          ) : !error && filteredListings.length > 0 ? (
            <div className="product-grid pt-5">
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
                  <button type="button" onClick={() => writeParams({ category: '', region: '', craft: '', material: '', price: '' }, 'featured', '')} className="button-light min-h-11 rounded-md px-5 text-sm font-semibold">
                    Clear filters
                  </button>
                )}
              </EmptyState>
            </div>
          ) : null}
        </div>
      </div>

      <FilterSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        categories={categories}
        regions={regions}
        crafts={crafts}
        materials={materials}
        values={values}
        sort={sort}
        onApply={(nextValues, nextSort) => writeParams(nextValues, nextSort)}
      />
    </div>
  );
};

export default MarketplacePage;
