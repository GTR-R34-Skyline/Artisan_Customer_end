import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState, Eyebrow, ImageFrame, LoadingState, Reveal, StatusLabel } from '../components/DesignSystem';
import { ProductCard } from '../components/ProductCard';
import { getCraftsmanProfile } from '../services/marketplace.service';
import { CraftsmanProfile, getProductImage, getProductStory, MarketplaceListing } from '../types/marketplace';
import { getLanguageConfig } from '../utils/languages';

const CraftsmanPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [craftsman, setCraftsman] = useState<CraftsmanProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [storyOpen, setStoryOpen] = useState(false);

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
    return <div className="mx-auto max-w-market px-4 py-16 lg:px-8"><LoadingState label="Opening the artisan’s collection" /></div>;
  }

  if (error || !craftsman) {
    return <div className="mx-auto max-w-market px-4 py-16 lg:px-8"><EmptyState title="Artisan not found." description={error || 'This profile may no longer be available.'} /></div>;
  }

  const heroProduct = craftsman.products[0];
  const descriptionProduct = craftsman.products.find((product) => getProductStory(product));
  const story = descriptionProduct ? getProductStory(descriptionProduct) : null;
  const specialization = craftsman.craft_type || specializations.join(' · ');
  const storyPreview = story && story.length > 240 && !storyOpen ? `${story.slice(0, 240).trim()}…` : story;

  return (
    <div className="craftsman-page mx-auto max-w-market px-4 pb-20 pt-6 lg:px-8 lg:pt-10">
      <button type="button" onClick={() => navigate(-1)} className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-stone-600 hover:text-indigo">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} /> Back to collection
      </button>

      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <Reveal>
          <ImageFrame
            src={heroProduct ? getProductImage(heroProduct) : null}
            alt={craftsman.full_name || 'Artisan’s work'}
            label={craftsman.full_name || 'Independent artisan'}
            className="aspect-[4/5] lg:aspect-[4/5]"
          />
        </Reveal>
        <Reveal delay="80ms">
          <Eyebrow>{specialization || 'Independent artisan'}</Eyebrow>
          <h1 className="mt-3 font-display text-[1.85rem] leading-[1.1] tracking-[-0.03em] text-charcoal sm:text-6xl">
            {craftsman.full_name || 'Independent artisan'}
          </h1>
          <div className="mt-5 flex flex-wrap gap-2">
            {craftsman.verification_status === 'verified' && <StatusLabel tone="success">Verified artisan</StatusLabel>}
            {craftsman.gi_certified && <StatusLabel>GI-certified craft</StatusLabel>}
          </div>
          <dl className="mt-6 grid max-w-xl grid-cols-2 gap-3">
            {craftsman.location_state && (
              <div className="bg-cream px-4 py-3">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Based in</dt>
                <dd className="mt-1 text-charcoal">{craftsman.location_state}</dd>
              </div>
            )}
            {specialization && (
              <div className="bg-cream px-4 py-3">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Craft</dt>
                <dd className="mt-1 text-charcoal">{specialization}</dd>
              </div>
            )}
            {craftsman.preferred_language && (
              <div className="bg-cream px-4 py-3">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">Language</dt>
                <dd className="mt-1 text-charcoal">{getLanguageConfig(craftsman.preferred_language).displayName}</dd>
              </div>
            )}
            {craftsman.products.length > 0 && (
              <div className="bg-cream px-4 py-3">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">In the shop</dt>
                <dd className="mt-1 text-charcoal">{craftsman.products.length} {craftsman.products.length === 1 ? 'piece' : 'pieces'}</dd>
              </div>
            )}
          </dl>
          {storyPreview && (
            <div className="mt-6 max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">From the work</p>
              <p className="mt-2 text-sm leading-7 text-stone-600">{storyPreview}</p>
              {story && story.length > 240 && (
                <button type="button" onClick={() => setStoryOpen((open) => !open)} className="mt-2 text-sm font-semibold text-indigo">
                  {storyOpen ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>
          )}
        </Reveal>
      </section>

      <section className="mt-16 border-t border-stone-300 pt-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Eyebrow>The collection</Eyebrow>
            <h2 className="mt-3 font-display text-2xl text-charcoal sm:text-5xl">
              {craftsman.full_name ? `Works by ${craftsman.full_name}` : 'Works from the practice'}
            </h2>
          </div>
          {craftsman.products.length > 0 && (
            <span className="text-sm text-stone-500">{craftsman.products.length} {craftsman.products.length === 1 ? 'piece' : 'pieces'}</span>
          )}
        </div>
        {craftsman.products.length ? (
          <div className="product-grid mt-8">
            {craftsman.products.map((product: MarketplaceListing, index) => (
              <Reveal key={product.id} delay={`${Math.min(index, 5) * 40}ms`}>
                <ProductCard listing={product} compact />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="mt-10">
            <EmptyState title="The collection is taking shape." description="Published work from this artisan will appear here." />
          </div>
        )}
      </section>
    </div>
  );
};

export default CraftsmanPage;
