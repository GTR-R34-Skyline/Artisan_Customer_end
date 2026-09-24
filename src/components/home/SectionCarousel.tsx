import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type CarouselBreakpoints = {
  mobile: number;
  tablet: number;
  desktop: number;
};

interface SectionCarouselProps {
  children: React.ReactNode[];
  perView?: CarouselBreakpoints;
  gapPx?: number;
  prevLabel: string;
  nextLabel: string;
  className?: string;
  trackClassName?: string;
  autoPlay?: boolean;
  autoPlayIntervalMs?: number;
  transitionMs?: number;
  infinite?: boolean;
  pauseOnHover?: boolean;
  /** Hide arrow controls (autoplay / swipe still work). */
  showControls?: boolean;
}

const DEFAULT_PER_VIEW: CarouselBreakpoints = { mobile: 2, tablet: 3, desktop: 5 };

const resolvePerView = (perView: CarouselBreakpoints, width: number) => {
  if (width < 640) return perView.mobile;
  if (width < 1024) return perView.tablet;
  return perView.desktop;
};

export const SectionCarousel: React.FC<SectionCarouselProps> = ({
  children,
  perView = DEFAULT_PER_VIEW,
  gapPx = 12,
  prevLabel,
  nextLabel,
  className = '',
  trackClassName = '',
  autoPlay = false,
  autoPlayIntervalMs = 3200,
  transitionMs = 650,
  infinite = false,
  pauseOnHover = true,
  showControls: showControlsProp = true,
}) => {
  const items = React.Children.toArray(children).filter(Boolean);
  const count = items.length;

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const resumeTimer = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);
  const indexRef = useRef(0);

  const [viewportWidth, setViewportWidth] = useState(0);
  const [visible, setVisible] = useState(perView.desktop);
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);
  const [interactPaused, setInteractPaused] = useState(false);

  const canLoop = infinite && count > visible;
  const clones = canLoop ? visible : 0;
  const slides = canLoop ? [...items.slice(-clones), ...items, ...items.slice(0, clones)] : items;
  const slideWidth = viewportWidth > 0 ? (viewportWidth - gapPx * (visible - 1)) / visible : 0;
  const step = slideWidth + gapPx;
  const minIndex = canLoop ? clones : 0;
  const maxIndex = canLoop ? clones + count - 1 : Math.max(0, count - visible);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const measure = () => {
      const width = viewport.clientWidth;
      setViewportWidth(width);
      setVisible(resolvePerView(perView, window.innerWidth));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [perView]);

  // Keep logical index in range when layout changes
  useEffect(() => {
    setAnimate(false);
    const next = canLoop ? clones : 0;
    setIndex(next);
    indexRef.current = next;
    const id = window.requestAnimationFrame(() => setAnimate(true));
    return () => window.cancelAnimationFrame(id);
  }, [count, clones, canLoop, visible]);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const pauseInteraction = useCallback(() => {
    setInteractPaused(true);
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setInteractPaused(false), 4200);
  }, []);

  const goNext = useCallback(() => {
    if (count <= visible && !canLoop) return;
    pauseInteraction();
    setAnimate(true);
    setIndex((current) => {
      if (canLoop) return current + 1;
      return Math.min(current + 1, Math.max(0, count - visible));
    });
  }, [canLoop, count, visible, pauseInteraction]);

  const goPrev = useCallback(() => {
    if (count <= visible && !canLoop) return;
    pauseInteraction();
    setAnimate(true);
    setIndex((current) => {
      if (canLoop) return current - 1;
      return Math.max(current - 1, 0);
    });
  }, [canLoop, count, visible, pauseInteraction]);

  // Seamless loop after transition
  useEffect(() => {
    if (!canLoop) return undefined;
    const track = trackRef.current;
    if (!track) return undefined;

    const onEnd = (event: TransitionEvent) => {
      if (event.target !== track || event.propertyName !== 'transform') return;
      const current = indexRef.current;
      if (current >= clones + count) {
        setAnimate(false);
        const jumped = clones + (current - (clones + count));
        setIndex(jumped);
        indexRef.current = jumped;
      } else if (current < clones) {
        setAnimate(false);
        const jumped = clones + count + (current - clones);
        setIndex(jumped);
        indexRef.current = jumped;
      }
    };

    track.addEventListener('transitionend', onEnd);
    return () => track.removeEventListener('transitionend', onEnd);
  }, [canLoop, clones, count]);

  useEffect(() => {
    if (animate) return undefined;
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setAnimate(true));
    });
    return () => window.cancelAnimationFrame(id);
  }, [animate, index]);

  useEffect(() => {
    if (!autoPlay || count <= visible) return undefined;
    if (paused || interactPaused) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const timer = window.setInterval(() => {
      setAnimate(true);
      setIndex((current) => {
        if (canLoop) return current + 1;
        const end = Math.max(0, count - visible);
        return current >= end ? 0 : current + 1;
      });
    }, autoPlayIntervalMs);

    return () => window.clearInterval(timer);
  }, [autoPlay, autoPlayIntervalMs, paused, interactPaused, count, visible, canLoop]);

  useEffect(
    () => () => {
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    },
    [],
  );

  const showControls = showControlsProp && count > visible;
  const offset = step > 0 ? index * step : 0;

  const onTouchStart = (event: React.TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    touchDeltaX.current = 0;
  };

  const onTouchMove = (event: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    touchDeltaX.current = (event.touches[0]?.clientX ?? 0) - touchStartX.current;
  };

  const onTouchEnd = () => {
    const delta = touchDeltaX.current;
    touchStartX.current = null;
    touchDeltaX.current = 0;
    if (Math.abs(delta) < 40) return;
    if (delta < 0) goNext();
    else goPrev();
  };

  if (!count) return null;

  return (
    <div
      className={`section-carousel relative min-w-0 ${className}`}
      onMouseEnter={() => pauseOnHover && setPaused(true)}
      onMouseLeave={() => pauseOnHover && setPaused(false)}
    >
      <div
        ref={viewportRef}
        className="section-carousel-viewport min-w-0 overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          ref={trackRef}
          className={`section-carousel-track flex ${trackClassName}`}
          style={{
            gap: `${gapPx}px`,
            transform: `translate3d(-${offset}px, 0, 0)`,
            transition: animate ? `transform ${transitionMs}ms cubic-bezier(0.22, 1, 0.36, 1)` : 'none',
            willChange: 'transform',
          }}
        >
          {slides.map((child, slideIndex) => (
            <div
              key={slideIndex}
              className="section-carousel-slide min-w-0 shrink-0"
              style={{
                width: slideWidth > 0 ? `${slideWidth}px` : `calc((100% - ${(visible - 1) * gapPx}px) / ${visible})`,
              }}
            >
              {child}
            </div>
          ))}
        </div>
      </div>

      {showControls && (
        <div className="section-carousel-controls mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            className="section-carousel-btn"
            aria-label={prevLabel}
            onClick={goPrev}
            disabled={!canLoop && index <= minIndex}
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="section-carousel-btn"
            aria-label={nextLabel}
            onClick={goNext}
            disabled={!canLoop && index >= maxIndex}
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      )}
    </div>
  );
};
