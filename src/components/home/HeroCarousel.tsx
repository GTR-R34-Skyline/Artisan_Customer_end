import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeroSlide } from '../../utils/homeDiscovery';

interface HeroCarouselProps {
  slides: HeroSlide[];
}

const AUTO_MS = 4800;
const TRANSITION_MS = 700;

export const HeroCarousel: React.FC<HeroCarouselProps> = ({ slides }) => {
  const count = slides.length;
  const canLoop = count > 1;

  // Cloned head/tail so we can wrap without a visual jump (360° loop).
  const trackSlides = canLoop ? [slides[count - 1], ...slides, slides[0]] : slides;
  const [trackIndex, setTrackIndex] = useState(canLoop ? 1 : 0);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);
  const trackIndexRef = useRef(trackIndex);

  useEffect(() => {
    trackIndexRef.current = trackIndex;
  }, [trackIndex]);

  // Reset when slide set changes (e.g. listings load).
  useEffect(() => {
    setAnimate(false);
    setTrackIndex(canLoop ? 1 : 0);
    const id = window.requestAnimationFrame(() => setAnimate(true));
    return () => window.cancelAnimationFrame(id);
  }, [count, canLoop]);

  const logicalIndex = canLoop ? (trackIndex - 1 + count) % count : trackIndex;

  const jumpToClone = useCallback(() => {
    const current = trackIndexRef.current;
    if (!canLoop) return;
    if (current === 0) {
      setAnimate(false);
      setTrackIndex(count);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setAnimate(true));
      });
    } else if (current === count + 1) {
      setAnimate(false);
      setTrackIndex(1);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setAnimate(true));
      });
    }
  }, [canLoop, count]);

  useEffect(() => {
    if (!canLoop || paused) return undefined;
    const timer = window.setInterval(() => {
      setAnimate(true);
      setTrackIndex((current) => current + 1);
    }, AUTO_MS);
    return () => window.clearInterval(timer);
  }, [canLoop, paused, count]);

  const goTo = (slideIndex: number) => {
    setAnimate(true);
    setTrackIndex(canLoop ? slideIndex + 1 : slideIndex);
  };

  if (!count) return null;

  const active = slides[logicalIndex] ?? slides[0];

  return (
    <section
      className="hero-campaign relative overflow-hidden bg-royal"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured collections"
    >
      <div className="relative min-h-[22rem] overflow-hidden sm:min-h-[26rem] lg:min-h-[32rem]">
        <div
          className="flex h-full min-h-[22rem] sm:min-h-[26rem] lg:min-h-[32rem]"
          style={{
            transform: `translateX(-${trackIndex * 100}%)`,
            transition: animate ? `transform ${TRANSITION_MS}ms ease-in-out` : 'none',
          }}
          onTransitionEnd={jumpToClone}
        >
          {trackSlides.map((slide, slideIndex) => (
            <div
              key={`${slide.id}-${slideIndex}`}
              className="hero-campaign-slide relative min-h-[22rem] w-full min-w-full shrink-0 sm:min-h-[26rem] lg:min-h-[32rem]"
              aria-hidden={slideIndex !== trackIndex}
            >
              <img
                src={slide.image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                loading={slideIndex <= 1 ? 'eager' : 'lazy'}
                decoding="async"
              />
              <div className="hero-campaign-wash absolute inset-0" />
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-0 z-10 mx-auto flex min-h-[22rem] max-w-market flex-col justify-end px-4 py-8 sm:min-h-[26rem] sm:py-10 lg:min-h-[32rem] lg:px-8 lg:py-14">
          <div className="pointer-events-auto">
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
              <Link
                to="/marketplace"
                className="inline-flex min-h-11 items-center rounded-md border border-[rgba(243,234,204,0.35)] px-5 text-sm font-semibold text-ivory hover:border-gold hover:text-gold"
              >
                Explore Shop
              </Link>
            </div>
          </div>
        </div>
      </div>

      {canLoop && (
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2" role="tablist" aria-label="Hero slides">
          {slides.map((slide, slideIndex) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={slideIndex === logicalIndex}
              aria-label={`Show slide ${slideIndex + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                slideIndex === logicalIndex ? 'w-6 bg-gold' : 'w-1.5 bg-[rgba(243,234,204,0.45)]'
              }`}
              onClick={() => goTo(slideIndex)}
            />
          ))}
        </div>
      )}
    </section>
  );
};
