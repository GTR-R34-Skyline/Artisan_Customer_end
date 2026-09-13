import React, { useEffect, useRef } from 'react';

const SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY as string | undefined;

declare global {
  interface Window {
    hcaptcha?: {
      render: (
        el: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark';
        },
      ) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

interface CaptchaWidgetProps {
  onVerify: (token: string | null) => void;
  className?: string;
}

/**
 * Customer-auth CAPTCHA via hCaptcha.
 * When VITE_HCAPTCHA_SITE_KEY is unset, renders a clear notice and does not fake validation.
 * Secret verification belongs on the server (never expose CAPTCHA_SECRET_KEY to the client).
 */
export const CaptchaWidget: React.FC<CaptchaWidgetProps> = ({ onVerify, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!SITE_KEY) {
      onVerify(null);
      return undefined;
    }

    let cancelled = false;

    const mount = () => {
      if (cancelled || !containerRef.current || !window.hcaptcha || widgetIdRef.current) return;
      widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: (token) => onVerify(token),
        'expired-callback': () => onVerify(null),
        'error-callback': () => onVerify(null),
        theme: 'light',
      });
    };

    if (window.hcaptcha) {
      mount();
    } else {
      const existing = document.querySelector<HTMLScriptElement>('script[data-hcaptcha]');
      if (!existing) {
        const script = document.createElement('script');
        script.src = 'https://js.hcaptcha.com/1/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.dataset.hcaptcha = 'true';
        script.onload = () => mount();
        document.head.appendChild(script);
      } else {
        existing.addEventListener('load', mount);
      }
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.hcaptcha) {
        try {
          window.hcaptcha.reset(widgetIdRef.current);
        } catch {
          // ignore
        }
      }
    };
  }, [onVerify]);

  if (!SITE_KEY) {
    return (
      <p className={`rounded-md border border-dashed border-stone-300 bg-cream px-3 py-2 text-xs leading-5 text-stone-600 ${className}`}>
        CAPTCHA is not configured. Set <code className="font-semibold">VITE_HCAPTCHA_SITE_KEY</code> (and keep the secret server-side) to enable customer protection.
      </p>
    );
  }

  return <div ref={containerRef} className={className} />;
};

export const isCaptchaConfigured = () => Boolean(SITE_KEY);
