import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface ProductGalleryProps {
  images: string[];
  alt: string;
  fallbackLabel?: string;
}

export const ProductGallery: React.FC<ProductGalleryProps> = ({ images, alt, fallbackLabel = 'Handmade work' }) => {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const current = images[index] || images[0];

  useEffect(() => {
    setIndex(0);
  }, [images.join('|')]);

  useEffect(() => {
    if (!lightbox) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightbox(false);
      if (event.key === 'ArrowRight') setIndex((value) => Math.min(images.length - 1, value + 1));
      if (event.key === 'ArrowLeft') setIndex((value) => Math.max(0, value - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [images.length, lightbox]);

  const onScroll = () => {
    const scroller = scrollerRef.current;
    if (!scroller || !images.length) return;
    const next = Math.round(scroller.scrollLeft / Math.max(scroller.clientWidth, 1));
    setIndex(Math.max(0, Math.min(images.length - 1, next)));
  };

  if (!images.length) {
    return (
      <div className="flex aspect-square items-end bg-sand p-6">
        <p className="font-display text-2xl text-stone-700">{fallbackLabel}</p>
      </div>
    );
  }

  return (
    <>
      <div className="product-gallery min-w-0">
        <div className="lg:hidden">
          <div
            ref={scrollerRef}
            onScroll={onScroll}
            className="product-gallery-track hide-scrollbar"
            aria-label="Product photos"
          >
            {images.map((src, photoIndex) => (
              <button
                key={src}
                type="button"
                className="product-gallery-slide"
                onClick={() => { setIndex(photoIndex); setLightbox(true); }}
                aria-label={`View larger photo ${photoIndex + 1} of ${images.length}`}
              >
                <img src={src} alt={photoIndex === 0 ? alt : ''} className="h-full w-full object-contain" />
              </button>
            ))}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex items-center justify-center gap-1.5">
              {images.map((src, photoIndex) => (
                <span key={src} className={`gallery-dot ${photoIndex === index ? 'is-active' : ''}`} />
              ))}
            </div>
          )}
        </div>

        <div className="hidden gap-3 lg:flex">
          {images.length > 1 && (
            <div className="flex w-16 shrink-0 flex-col gap-2">
              {images.map((src, photoIndex) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setIndex(photoIndex)}
                  className={`product-thumb aspect-square w-16 shrink-0 ${index === photoIndex ? 'is-active' : ''}`}
                  aria-label={`View product photo ${photoIndex + 1}`}
                  aria-pressed={index === photoIndex}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            className="image-frame min-w-0 flex-1 aspect-square bg-sand"
            onClick={() => setLightbox(true)}
            aria-label="View larger product photo"
          >
            <img src={current} alt={alt} className="h-full w-full object-contain" />
          </button>
        </div>
      </div>

      {lightbox && (
        <div className="lightbox-root" role="dialog" aria-modal="true" aria-label="Product photo">
          <button type="button" className="lightbox-backdrop" aria-label="Close photo" onClick={() => setLightbox(false)} />
          <button type="button" className="lightbox-close header-icon inline-flex" aria-label="Close photo" onClick={() => setLightbox(false)}>
            <X className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <img src={current} alt={alt} className="lightbox-image" />
          {images.length > 1 && (
            <div className="lightbox-thumbs hide-scrollbar">
              {images.map((src, photoIndex) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setIndex(photoIndex)}
                  className={`product-thumb h-14 w-14 shrink-0 ${index === photoIndex ? 'is-active' : ''}`}
                  aria-label={`Show photo ${photoIndex + 1}`}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};
