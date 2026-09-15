import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { EmptyState, Eyebrow, LoadingState, Reveal } from '../components/DesignSystem';
import { getMarketplaceListings } from '../services/marketplace.service';
import { MarketplaceProfile } from '../types/marketplace';

const ArtisansPage: React.FC = () => {
  const [artisans, setArtisans] = useState<MarketplaceProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMarketplaceListings()
      .then((listings) => {
        const artisanMap = new Map<string, MarketplaceProfile>();

        listings.forEach((listing) => {
          if (listing.artisan) {
            artisanMap.set(listing.artisan.id, listing.artisan);
          }
        });

        setArtisans(Array.from(artisanMap.values()));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-market px-4 py-16 lg:px-8">
        <LoadingState label="Discovering our artisans" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-market px-4 pb-20 pt-8 lg:px-8 lg:pt-12">
      <Reveal>
        <Eyebrow>Meet the makers</Eyebrow>

        <h1 className="mt-3 max-w-3xl font-display text-4xl leading-[1.05] tracking-[-0.04em] text-charcoal sm:text-6xl">
          Artisans of India
        </h1>

        <p className="mt-5 max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">
          Discover the people behind the craft — each artisan bringing
          traditional skills, materials, and regional character into every
          handmade piece.
        </p>
      </Reveal>

      {artisans.length === 0 ? (
        <div className="mt-12">
          <EmptyState
            title="No artisans found."
            description="Published artisan work will appear here as the collection grows."
          />
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {artisans.map((artisan, index) => (
            <Reveal
              key={artisan.id}
              delay={`${Math.min(index, 5) * 40}ms`}
            >
              <Link
                to={`/craftsman/${artisan.id}`}
                className="group block overflow-hidden bg-cream"
              >
                <div className="aspect-[4/5] overflow-hidden bg-sand">
                  {artisan.profile_image_url ? (
                    <img
                      src={artisan.profile_image_url}
                      alt={`Portrait of ${artisan.full_name || 'artisan'}`}
                      className="h-full w-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-[1.03]"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-stone-500">
                      Artisan
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-display text-xl text-charcoal">
                        {artisan.full_name || 'Independent artisan'}
                      </h2>

                      <p className="mt-1 text-xs text-stone-500">
                        {[
                          artisan.location_state,
                          artisan.craft_type,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>

                    <ArrowRight
                      className="mt-1 h-4 w-4 shrink-0 text-royal transition-transform duration-300 ease-in-out group-hover:translate-x-1"
                      strokeWidth={1.75}
                    />
                  </div>

                  {artisan.artisan_story && (
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-stone-600">
                      {artisan.artisan_story}
                    </p>
                  )}

                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-royal">
                    Read Story →
                  </p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
};

export default ArtisansPage;