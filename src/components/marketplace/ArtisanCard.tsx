import React from 'react';
import { Link } from 'react-router-dom';
import { getProductImage, MarketplaceListing } from '../../types/marketplace';

interface ArtisanCardProps {
  listing: MarketplaceListing;
}

export const ArtisanCard: React.FC<ArtisanCardProps> = ({ listing }) => {
  const artisan = listing.artisan;
  if (!artisan?.id) return null;

  const image = getProductImage(listing);
  const craft = artisan.craft_type || listing.category;
  const name = artisan.full_name || 'Independent artisan';

  return (
    <Link to={`/craftsman/${artisan.id}`} className="artisan-card group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-sand">
        {image ? (
          <img src={image} alt={`Work by ${name}`} className="h-full w-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <div className="flex h-full items-end p-5">
            <p className="font-display text-2xl text-stone-700">{name}</p>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal/80 via-charcoal/25 to-transparent p-4 pt-16">
          <p className="line-clamp-2 font-display text-lg leading-tight text-cream">{name}</p>
          <p className="mt-1 line-clamp-1 text-xs text-cream/80">
            {[artisan.location_state, craft].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
    </Link>
  );
};
