import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { HeroSlide } from '../../utils/homeDiscovery';

interface HeroCarouselProps {
  slides: HeroSlide[];
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ slides }) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || slides.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 5600);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  if (!slides.length) return null;

  const active = slides[index];

  return (
    <section
      className="hero-campaign relative overflow-hidden bg-royal"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured collections"
    >
      <div className="relative min-h-[22rem] sm:min-h-[26rem] lg:min-h-[32rem]">
        {slides.map((slide, slideIndex) => (
          <div
            key={slide.id}
            className={`hero-campaign-slide absolute inset-0 transition-opacity duration-700 ${
              slideIndex === index ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            aria-hidden={slideIndex !== index}
          >
            <img
              src={slide.image}
              alt=""
              className="h-full w-full object-cover"
              loading={slideIndex === 0 ? 'eager' : 'lazy'}
              decoding="async"
            />
            <div className="hero-campaign-wash absolute inset-0" />
          </div>
        ))}

        <div className="relative z-10 mx-auto flex min-h-[22rem] max-w-market flex-col justify-end px-4 py-8 sm:min-h-[26rem] sm:py-10 lg:min-h-[32rem] lg:px-8 lg:py-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold">{active.eyebrow}</p>
          <h1 className="mt-3 max-w-xl font-display text-[2rem] leading-[1.08] tracking-[-0.03em] text-ivory sm:text-5xl lg:text-[3.4rem]">
            {active.title}
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-[rgba(243,234,204,0.88)] sm:text-base sm:leading-7">
            {active.subtitle}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link to={active.to} className="button-dark inline-flex min-h-11 items-center rounded-md px-5 text-sm font-semibold">
              {active.cta}
            </Link>
            <Link to="/marketplace" className="inline-flex min-h-11 items-center rounded-md border border-[rgba(243,234,204,0.35)] px-5 text-sm font-semibold text-ivory hover:border-gold hover:text-gold">
              Explore Shop
            </Link>
          </div>
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <button
            type="button"
            className="hero-campaign-nav left-3"
            aria-label="Previous slide"
            onClick={() => setIndex((current) => (current - 1 + slides.length) % slides.length)}
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="hero-campaign-nav right-3"
            aria-label="Next slide"
            onClick={() => setIndex((current) => (current + 1) % slides.length)}
          >
            <ChevronRight className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2" role="tablist" aria-label="Hero slides">
            {slides.map((slide, slideIndex) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={slideIndex === index}
                aria-label={`Show slide ${slideIndex + 1}`}
                className={`h-1.5 rounded-full transition-all ${slideIndex === index ? 'w-6 bg-gold' : 'w-1.5 bg-[rgba(243,234,204,0.45)]'}`}
                onClick={() => setIndex(slideIndex)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};
