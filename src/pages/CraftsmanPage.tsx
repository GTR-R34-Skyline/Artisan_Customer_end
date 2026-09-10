import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, MapPin } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowButton, EmptyState, Eyebrow, ImageFrame, LoadingState, Reveal } from '../components/DesignSystem';
import { ProductCard } from '../components/ProductCard';
import { getCraftsmanProfile } from '../services/marketplace.service';
import { CraftsmanProfile, getProductDescription, getProductImage, MarketplaceListing } from '../types/marketplace';

const CraftsmanPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [craftsman, setCraftsman] = useState<CraftsmanProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    getCraftsmanProfile(id)
      .then(setCraftsman)
      .catch(() => setError('This craftsman could not be loaded.'))
      .finally(() => setLoading(false));
  }, [id]);

  const specializations = useMemo(() => {
    if (!craftsman) return [];
    return Array.from(new Set(
      craftsman.products
        .map((product) => product.category)
        .filter((category): category is string => Boolean(category)),
    ));
  }, [craftsman]);

  if (loading) {
    return <div className="mx-auto max-w-market px-4 py-16 lg:px-8"><LoadingState label="Opening the craftsman’s exhibition" /></div>;
  }

  if (error || !craftsman) {
    return <div className="mx-auto max-w-market px-4 py-16 lg:px-8"><EmptyState title="Craftsman not found." description={error || 'This profile may no longer be available.'} /></div>;
  }

  const heroProduct = craftsman.products[0];
  const descriptionProduct = craftsman.products.find((product) => product.raw_description || product.description_en);
  const specialization = craftsman.craft_type || specializations.join(' · ');

  return (
    <div className="craftsman-page mx-auto max-w-market px-4 pb-20 pt-6 lg:px-8 lg:pt-10">
      <button type="button" onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-terracotta">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Back to collection
      </button>

      <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
        <Reveal>
          <ImageFrame src={heroProduct ? getProductImage(heroProduct) : null} alt={craftsman.full_name || 'Craftsman’s work'} label={craftsman.full_name || 'Independent craftsman'} className="aspect-[4/3] lg:aspect-[5/4]" />
        </Reveal>
        <Reveal delay="100ms">
          <Eyebrow>{specialization || 'Independent craftsman'}</Eyebrow>
          <h1 className="mt-3 font-display text-4xl leading-[1.05] tracking-[-0.03em] text-charcoal sm:text-6xl">{craftsman.full_name || 'Independent craftsman'}</h1>
          <div className="mt-5 flex flex-wrap gap-3 text-sm text-stone-600">
            {craftsman.location_state && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-4 w-4" strokeWidth={1.75} />
                {craftsman.location_state}
              </span>
            )}
            {craftsman.preferred_language && <span>{craftsman.preferred_language}</span>}
            {craftsman.products.length > 0 && <span>{craftsman.products.length} {craftsman.products.length === 1 ? 'piece' : 'pieces'} available</span>}
          </div>
          {heroProduct && <ArrowButton to="/login" className="mt-8">Inquire about this work</ArrowButton>}
        </Reveal>
      </section>

      {(descriptionProduct || specialization || craftsman.location_state || craftsman.preferred_language) && (
        <section className="mt-16 grid gap-8 border-t border-stone-300 pt-10 lg:grid-cols-[0.4fr_1fr]">
          <Reveal><Eyebrow>The maker</Eyebrow></Reveal>
          <Reveal delay="80ms" className="max-w-3xl">
            <h2 className="font-display text-3xl leading-[1.1] text-charcoal sm:text-5xl">
              {craftsman.full_name ? `The work of ${craftsman.full_name}.` : 'An independent practice.'}
            </h2>
            {descriptionProduct && <p className="mt-6 max-w-2xl text-base leading-8 text-stone-600">{getProductDescription(descriptionProduct)}</p>}
            <dl className="mt-8 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-3">
              {specialization && <div className="rounded-xl bg-sand/70 px-4 py-3"><dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Craft</dt><dd className="mt-1 text-charcoal">{specialization}</dd></div>}
              {craftsman.location_state && <div className="rounded-xl bg-sand/70 px-4 py-3"><dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Based in</dt><dd className="mt-1 text-charcoal">{craftsman.location_state}</dd></div>}
              {craftsman.preferred_language && <div className="rounded-xl bg-sand/70 px-4 py-3"><dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Language</dt><dd className="mt-1 text-charcoal">{craftsman.preferred_language}</dd></div>}
            </dl>
          </Reveal>
        </section>
      )}

      <section className="mt-16 border-t border-stone-300 pt-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Eyebrow>The collection</Eyebrow>
            <h2 className="mt-3 font-display text-3xl text-charcoal sm:text-5xl">{craftsman.full_name ? `Works by ${craftsman.full_name}.` : 'Works from the practice.'}</h2>
          </div>
          {craftsman.products.length > 0 && <span className="text-sm text-stone-500">{craftsman.products.length} selected {craftsman.products.length === 1 ? 'work' : 'works'}</span>}
        </div>
        {craftsman.products.length ? (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {craftsman.products.map((product: MarketplaceListing, index) => (
              <Reveal key={product.id} delay={`${Math.min(index, 5) * 60}ms`}>
                <ProductCard listing={product} compact />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="mt-10">
            <EmptyState title="The collection is taking shape." description="Published work from this craftsman will appear here." />
          </div>
        )}
      </section>
    </div>
  );
};

export default CraftsmanPage;
