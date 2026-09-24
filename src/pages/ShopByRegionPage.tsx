import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { IndiaMap } from '../components/region/IndiaMap';
import { getMarketplaceListings } from '../services/marketplace.service';
import { MarketplaceListing } from '../types/marketplace';
import { listingsByRegion } from '../utils/marketplace';

const ShopByRegionPage: React.FC = () => {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);

  useEffect(() => {
    getMarketplaceListings()
      .then(setListings)
      .catch(() => setListings([]));
  }, []);

  const regions = useMemo(() => listingsByRegion(listings), [listings]);
  const availableStates = useMemo(() => new Set(regions.map((region) => region.name)), [regions]);

  return (
    <div className="shop-by-region-page mx-auto w-full min-w-0 max-w-market overflow-x-hidden px-4 pb-12 pt-6 md:pb-16 md:pt-8 lg:px-8">
      <nav className="mb-5 text-sm text-stone-500" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-royal">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-charcoal">Shop by Region</span>
      </nav>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.2fr)] lg:gap-10 xl:gap-14">
        <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Geography of art
          </p>
          <h1 className="mt-3 max-w-[14ch] font-display text-[2.15rem] leading-[1.08] tracking-[-0.03em] text-charcoal sm:text-5xl lg:text-[3.1rem]">
            Explore India through craft.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-stone-600">
            Every region of India holds centuries of distinct craft heritage. Select a state on the map
            to discover products made by artisans of that place.
          </p>
          <Link
            to="/marketplace"
            className="button-dark mt-6 inline-flex min-h-11 items-center gap-2 rounded-md px-5 text-sm font-semibold"
          >
            View Entire Marketplace <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
          </Link>

          {regions.length > 0 && (
            <div className="mt-8 border-t border-stone-300 pt-5 lg:hidden">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                Regions with work
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {regions.slice(0, 10).map((region) => (
                  <Link
                    key={region.name}
                    to={`/marketplace?region=${encodeURIComponent(region.name)}`}
                    className="category-chip"
                  >
                    {region.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0 rounded-xl border border-stone-300/70 bg-cream/60 p-3 sm:p-5">
          <IndiaMap availableStates={availableStates} />
          <p className="mt-3 text-center text-[11px] text-stone-500 sm:text-left">
            Hover a state to preview · Click to explore products from that region
          </p>
        </div>
      </div>

      {regions.length > 0 && (
        <section className="mt-10 hidden border-t border-stone-300 pt-8 lg:block">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl tracking-[-0.03em] text-charcoal">Regions with work</h2>
              <p className="mt-1 text-sm text-stone-600">Jump directly to a state that currently has published pieces.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {regions.map((region) => (
              <Link
                key={region.name}
                to={`/marketplace?region=${encodeURIComponent(region.name)}`}
                className="group rounded-lg border border-stone-300/80 bg-ivory px-4 py-3 transition hover:border-royal/40"
              >
                <p className="font-semibold text-charcoal group-hover:text-royal">{region.name}</p>
                <p className="mt-0.5 text-xs text-stone-500">
                  {region.count} {region.count === 1 ? 'piece' : 'pieces'}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ShopByRegionPage;
