import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard } from '../ProductCard';
import { MarketplaceListing } from '../../types/marketplace';

type Breakpoints = { mobile: number; tablet: number; desktop: number };

interface TwoRowProductCarouselProps {
  listings: MarketplaceListing[];
  /** Columns per row (two rows → columns * 2 products per page). */
  columnsPerView?: Breakpoints;
  gapPx?: number;
  prevLabel?: string;
  nextLabel?: string;
}

const DEFAULT_COLUMNS: Breakpoints = { mobile: 2, tablet: 3, desktop: 5 };

const resolveColumns = (bp: Breakpoints, width: number) => {
  if (width < 640) return bp.mobile;
  if (width < 1024) return bp.tablet;
  return bp.desktop;
};

const chunkPages = (listings: MarketplaceListing[], pageSize: number) => {
  if (pageSize <= 0) return [listings];
  const pages: MarketplaceListing[][] = [];
  for (let i = 0; i < listings.length; i += pageSize) {
    pages.push(listings.slice(i, i + pageSize));
  }
  return pages.length ? pages : [[]];
};

export const TwoRowProductCarousel: React.FC<TwoRowProductCarouselProps> = ({
  listings,
  columnsPerView = DEFAULT_COLUMNS,
  gapPx = 12,
  prevLabel = 'Previous product',
  nextLabel = 'Next product',
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);

  const [viewportWidth, setViewportWidth] = useState(0);
  const [visible, setVisible] = useState(columnsPerView.desktop);
  const [index, setIndex] = useState(0);

  const pageSize = visible * 2;
  const pages = useMemo(() => chunkPages(listings, pageSize), [listings, pageSize]);
  const pageCount = pages.length;
  const maxIndex = Math.max(0, pageCount - 1);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const measure = () => {
      setViewportWidth(viewport.clientWidth);
      setVisible(resolveColumns(columnsPerView, window.innerWidth));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [columnsPerView]);

  useEffect(() => {
    setIndex((current) => Math.min(current, maxIndex));
  }, [maxIndex]);

  const goNext = useCallback(() => {
    setIndex((current) => Math.min(current + 1, maxIndex));
  }, [maxIndex]);

  const goPrev = useCallback(() => {
    setIndex((current) => Math.max(current - 1, 0));
  }, []);

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

  if (!listings.length) return null;

  const showControls = pageCount > 1;
  const offset = viewportWidth > 0 ? index * (viewportWidth + gapPx) : 0;

  return (
    <div className="section-carousel relative min-w-0">
      <div
        ref={viewportRef}
        className="section-carousel-viewport min-w-0 overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="section-carousel-track flex"
          style={{
            gap: `${gapPx}px`,
            transform: `translate3d(-${offset}px, 0, 0)`,
            transition: 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)',
            willChange: 'transform',
          }}
        >
          {pages.map((page, pageIndex) => (
            <div
              key={pageIndex}
              className="product-card-compact grid shrink-0"
              style={{
                width: viewportWidth > 0 ? `${viewportWidth}px` : '100%',
                gridTemplateColumns: `repeat(${visible}, minmax(0, 1fr))`,
                gap: `${gapPx}px`,
              }}
            >
              {page.map((listing, itemIndex) => (
                <ProductCard
                  key={listing.id}
                  listing={listing}
                  compact
                  priority={pageIndex === 0 && itemIndex < visible}
                />
              ))}
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
            disabled={index <= 0}
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="section-carousel-btn"
            aria-label={nextLabel}
            onClick={goNext}
            disabled={index >= maxIndex}
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      )}
    </div>
  );
};
