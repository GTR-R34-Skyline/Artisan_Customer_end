import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, ChevronLeft, ChevronRight, HeartHandshake, MapPin, Sparkles } from 'lucide-react';
import { ArrowButton, Reveal, SectionHeading } from '../components/DesignSystem';
import { ProductCard } from '../components/ProductCard';
import { getMarketplaceListings } from '../services/marketplace.service';
import { getProductImage, MarketplaceListing } from '../types/marketplace';

const homepageCards = [
  {
    category: 'Folk sculpture',
    title: 'Painted stories.',
    src: '/images/folk-elephants.png',
    content: 'Color, line, and form turn everyday objects into keepable stories.',
  },
  {
    category: 'Natural fibre',
    title: 'Woven utility.',
    src: '/images/woven-baskets.jpg',
    content: 'Patiently built forms that carry the rhythm of the hands that made them.',
  },
  {
    category: 'Embroidered textiles',
    title: 'Threaded memory.',
    src: '/images/embroidered-textile.png',
    content: 'Texture and pattern gathered into pieces with a quiet, tactile presence.',
  },
  {
    category: 'Adornment',
    title: 'Color in circles.',
    src: '/images/colorful-bangles.jpg',
    content: 'Small gestures of color, made to move with the people who wear them.',
  },
  {
    category: 'Handloom',
    title: 'The rhythm of the loom.',
    src: '/images/handloom-weaving.png',
    content: 'A close study of material, repetition, and the beauty of making slowly.',
  },
];

const categoryFallback: Record<string, string> = {
  Handloom: '/images/handloom-weaving.png',
};

const HomePage: React.FC = () => {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);

  useEffect(() => {
    getMarketplaceListings()
      .then(setListings)
      .catch(() => setListings([]));
  }, []);

  useEffect(() => {
    if (heroPaused) return undefined;
    const timer = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % homepageCards.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [heroPaused]);

  const activeHero = homepageCards[heroIndex];
  const showHero = (direction: number) => {
    setHeroIndex((current) => (current + direction + homepageCards.length) % homepageCards.length);
  };

  const categories = useMemo(() => {
    const byCategory = new Map<string, MarketplaceListing[]>();
    listings.forEach((listing) => {
      if (!listing.category) return;
      const group = byCategory.get(listing.category) || [];
      group.push(listing);
      byCategory.set(listing.category, group);
    });
    const fromListings = Array.from(byCategory.entries()).map(([name, items]) => ({
      name,
      image: getProductImage(items[0]) || categoryFallback[name] || '/images/handloom-weaving.png',
    }));
    return fromListings;
  }, [listings]);

  const featured = listings.slice(0, 10);
  const makers = useMemo(() => {
    const seen = new Map<string, MarketplaceListing>();
    listings.forEach((listing) => {
      if (listing.artisan?.id && !seen.has(listing.artisan.id)) {
        seen.set(listing.artisan.id, listing);
      }
    });
    return Array.from(seen.values()).slice(0, 4);
  }, [listings]);

  return (
    <div className="home-page">
      <section className="mx-auto max-w-market px-4 pt-4 lg:px-8 lg:pt-6">
        <div
          className="hero-carousel relative overflow-hidden rounded-[1.5rem] bg-sand"
          onMouseEnter={() => setHeroPaused(true)}
          onMouseLeave={() => setHeroPaused(false)}
        >
          {homepageCards.map((card, index) => (
            <img
              key={card.src}
              src={card.src}
              alt={card.title}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${index === heroIndex ? 'opacity-100' : 'opacity-0'}`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal/80 via-charcoal/35 to-transparent" />
          <div className="relative z-10 flex h-[28rem] flex-col justify-end p-6 sm:h-[32rem] sm:justify-center sm:p-10 lg:h-[36rem] lg:p-16">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-terracotta-light">Handmade marketplace · Across India</p>
            <h1 className="hero-title mt-3 max-w-xl font-display text-4xl leading-[1.08] tracking-[-0.03em] text-cream sm:text-5xl lg:text-6xl">
              Crafted by Hands, Powered by Possibilities
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-cream/85 sm:text-base">
              Discover authentic handmade products from India’s talented artisans.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ArrowButton to="/marketplace">Shop Now</ArrowButton>
              <a href="#makers" className="button-light inline-flex min-h-11 items-center rounded-full border-cream/40 bg-cream/10 px-5 text-sm font-semibold text-cream">
                Meet Our Artisans
              </a>
            </div>
            <p className="mt-8 max-w-sm text-xs leading-5 text-cream/75">
              {activeHero.category} · {activeHero.title}
            </p>
          </div>
          <button type="button" className="hero-carousel-nav left-3" aria-label="Previous craft" onClick={() => showHero(-1)}>
            <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <button type="button" className="hero-carousel-nav right-3" aria-label="Next craft" onClick={() => showHero(1)}>
            <ChevronRight className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {homepageCards.map((card, index) => (
              <button
                key={card.src}
                type="button"
                aria-label={`Show ${card.category}`}
                onClick={() => setHeroIndex(index)}
                className={`h-1.5 rounded-full transition-all ${index === heroIndex ? 'w-7 bg-cream' : 'w-2.5 bg-cream/45'}`}
              />
            ))}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { icon: BadgeCheck, label: 'Authentic Handmade' },
            { icon: HeartHandshake, label: 'Support Local Artisans' },
            { icon: Sparkles, label: 'Smart Discovery' },
            { icon: MapPin, label: 'Made Across India' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 rounded-2xl bg-cream px-3 py-3 text-xs font-semibold text-stone-700 sm:text-sm">
              <item.icon className="h-4 w-4 shrink-0 text-terracotta" strokeWidth={1.75} />
              {item.label}
            </div>
          ))}
        </div>
      </section>

      {categories.length > 0 && (
      <section id="categories" className="mx-auto max-w-market px-4 py-10 lg:px-8 lg:py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="market-section-title">Shop by Category</h2>
          <Link to="/marketplace" className="text-sm font-semibold text-terracotta">View All</Link>
        </div>
        <div className="flex gap-5 overflow-x-auto pb-2 hide-scrollbar lg:grid lg:grid-cols-8 lg:overflow-visible">
          {categories.map((category) => (
            <Link key={category.name} to={`/marketplace?category=${encodeURIComponent(category.name)}`} className="flex w-[5.5rem] shrink-0 flex-col items-center gap-2 text-center">
              <span className="block h-[5.5rem] w-[5.5rem] overflow-hidden rounded-full border border-stone-300 bg-sand shadow-card">
                <img src={category.image} alt="" className="h-full w-full object-cover transition duration-500 hover:scale-105" />
              </span>
              <span className="text-xs font-semibold text-charcoal">{category.name}</span>
            </Link>
          ))}
        </div>
      </section>
      )}

      <section className="mx-auto max-w-market px-4 pb-12 lg:px-8 lg:pb-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="market-section-title">Featured Products</h2>
          <Link to="/marketplace" className="inline-flex items-center gap-1 text-sm font-semibold text-terracotta">
            View All <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
          </Link>
        </div>
        {featured.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-5">
            {featured.map((listing, index) => (
              <Reveal key={listing.id} delay={`${Math.min(index, 6) * 50}ms`}>
                <ProductCard listing={listing} compact />
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="rounded-card border border-dashed border-stone-300 bg-cream px-5 py-10 text-sm text-stone-600">
            Published work will appear here as the collection grows.
          </p>
        )}
      </section>

      {makers.length > 0 && (
        <section id="makers" className="bg-cream py-12 lg:py-16">
          <div className="mx-auto max-w-market px-4 lg:px-8">
            <SectionHeading title="Meet Our Artisans" description="You are not only buying a product. You are discovering the person and craft behind it." />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {makers.map((listing) => (
                <Link key={listing.artisan?.id} to={`/craftsman/${listing.artisan?.id}`} className="panel overflow-hidden">
                  <div className="aspect-[4/3] overflow-hidden bg-sand">
                    <img src={getProductImage(listing) || '/images/handloom-weaving.png'} alt={listing.artisan?.full_name || 'Artisan'} className="h-full w-full object-cover transition duration-500 hover:scale-105" />
                  </div>
                  <div className="px-4 py-4">
                    <p className="font-display text-2xl text-charcoal">{listing.artisan?.full_name || 'Independent artisan'}</p>
                    <p className="mt-1 text-sm text-stone-600">{listing.category || 'Handmade craft'}</p>
                    {listing.artisan?.location_state && (
                      <p className="mt-2 inline-flex items-center gap-1 text-xs text-stone-500">
                        <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
                        {listing.artisan.location_state}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default HomePage;
