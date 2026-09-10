import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MarketplaceListing } from '../types/marketplace';

const WISHLIST_STORAGE_KEY = 'artisan.marketplace.wishlist';

interface WishlistContextValue {
  ids: string[];
  count: number;
  has: (productId: string) => boolean;
  toggle: (listing: MarketplaceListing) => void;
  items: MarketplaceListing[];
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

const readStoredWishlist = (): MarketplaceListing[] => {
  try {
    const raw = localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.id === 'string');
  } catch {
    return [];
  }
};

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<MarketplaceListing[]>(() => readStoredWishlist());

  useEffect(() => {
    localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const toggle = useCallback((listing: MarketplaceListing) => {
    setItems((current) => {
      const exists = current.some((item) => item.id === listing.id);
      return exists ? current.filter((item) => item.id !== listing.id) : [...current, listing];
    });
  }, []);

  const value = useMemo(() => {
    const ids = items.map((item) => item.id);
    return {
      ids,
      count: items.length,
      has: (productId: string) => ids.includes(productId),
      toggle,
      items,
    };
  }, [items, toggle]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
};

export const useWishlist = (): WishlistContextValue => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
