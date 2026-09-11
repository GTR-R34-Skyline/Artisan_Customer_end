import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Check } from 'lucide-react';
import { WeaverLoader } from './WeaverLoader';

export const Eyebrow: React.FC<{ children: React.ReactNode; light?: boolean }> = ({ children, light = false }) => (
  <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${light ? 'text-white/70' : 'text-indigo'}`}>
    {children}
  </p>
);

export const Reveal: React.FC<{ children: React.ReactNode; className?: string; delay?: string }> = ({
  children,
  className = '',
  delay,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.12 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={delay ? { '--reveal-delay': delay } as React.CSSProperties : undefined} className={`reveal ${visible ? 'is-visible' : ''} ${className}`}>
      {children}
    </div>
  );
};

export const SectionHeading: React.FC<{
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  action?: React.ReactNode;
}> = ({ eyebrow, title, description, align = 'left', action }) => (
  <div className={`flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${align === 'center' ? 'text-center sm:flex-col sm:items-center' : ''}`}>
    <div className={`max-w-2xl space-y-3 ${align === 'center' ? 'mx-auto' : ''}`}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="font-display text-[1.85rem] leading-[1.12] tracking-[-0.03em] text-charcoal sm:text-4xl lg:text-[2.6rem]">
        {title}
      </h2>
      {description && <p className="max-w-xl text-sm leading-7 text-stone-600 sm:text-[0.95rem]">{description}</p>}
    </div>
    {action}
  </div>
);

export const Button: React.FC<{
  children: React.ReactNode;
  variant?: 'dark' | 'light' | 'text';
  type?: 'button' | 'submit';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}> = ({ children, variant = 'dark', type = 'button', onClick, disabled = false, className = '' }) => {
  const styles = {
    dark: 'button-dark',
    light: 'button-light',
    text: 'button-text',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`group relative inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-semibold tracking-wide disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export const ArrowButton: React.FC<{
  children: React.ReactNode;
  to?: string;
  onClick?: () => void;
  className?: string;
}> = ({ children, to, onClick, className = '' }) => {
  const content = (
    <>
      <span>{children}</span>
      <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={1.75} />
    </>
  );

  const classes = `button-dark group inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 py-3 text-sm font-semibold tracking-wide ${className}`;

  if (to) {
    return <Link to={to} className={classes}>{content}</Link>;
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {content}
    </button>
  );
};

export const StatusLabel: React.FC<{ children: React.ReactNode; tone?: 'neutral' | 'success' | 'warning' }> = ({
  children,
  tone = 'neutral',
}) => {
  const tones = {
    neutral: 'bg-sand text-stone-700',
    success: 'bg-forest/10 text-forest',
    warning: 'bg-mustard/15 text-stone-800',
  };

  return (
    <span className={`inline-flex items-center gap-2 rounded-sm px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${tones[tone]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
};

export const ImageFrame: React.FC<{
  src?: string | null;
  alt: string;
  label?: string;
  className?: string;
  fit?: 'cover' | 'contain';
}> = ({ src, alt, label, className = '', fit = 'cover' }) => (
  <div className={`image-frame group relative overflow-hidden bg-stone-200 ${className}`}>
    {src ? (
      <img
        src={src}
        alt={alt}
        className={`h-full w-full ${fit === 'contain' ? 'object-contain' : 'object-cover'} transition duration-500 ease-out group-hover:scale-[1.03]`}
      />
    ) : (
      <div className="flex h-full min-h-48 items-end bg-sand p-5">
        <p className="font-display text-2xl leading-none text-stone-700">{label || 'A work in progress'}</p>
      </div>
    )}
  </div>
);

export const LoadingState: React.FC<{ label?: string }> = ({ label = 'The loom is at work' }) => (
  <WeaverLoader compact label={label} />
);

export const EmptyState: React.FC<{
  title: string;
  description: string;
  children?: React.ReactNode;
}> = ({ title, description, children }) => (
  <div className="empty-state px-6 py-14">
    <p className="font-display text-3xl text-charcoal">{title}</p>
    <p className="mt-3 max-w-md text-sm leading-6 text-stone-600">{description}</p>
    {children ? <div className="mt-6">{children}</div> : null}
  </div>
);

export const ProductSkeleton: React.FC<{ count?: number; className?: string }> = ({ count = 8, className = '' }) => (
  <div className={`grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4 ${className}`} aria-hidden="true">
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="overflow-hidden bg-cream">
        <div className="skeleton-block aspect-[4/5]" />
        <div className="space-y-2 px-1 py-3">
          <div className="skeleton-line w-5/6" />
          <div className="skeleton-line w-1/2" />
          <div className="skeleton-line w-1/3" />
        </div>
      </div>
    ))}
  </div>
);

export const Field: React.FC<{
  label: string;
  value: string | number;
  onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  type?: string;
  textarea?: boolean;
  required?: boolean;
}> = ({ label, value, onChange, placeholder, type = 'text', textarea = false, required = false }) => (
  <label className="field block space-y-2">
    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-600">
      {label}
      {required && <span className="ml-1 text-terracotta">*</span>}
    </span>
    {textarea ? (
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        rows={5}
        className="w-full resize-y rounded-md border border-stone-300 bg-cream px-4 py-3 text-sm text-charcoal outline-none placeholder:text-stone-500"
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-md border border-stone-300 bg-cream px-4 py-3 text-sm text-charcoal outline-none placeholder:text-stone-500"
      />
    )}
  </label>
);

export const CompletionMark: React.FC = () => (
  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-forest text-white">
    <Check className="h-3 w-3" strokeWidth={2} />
  </span>
);
