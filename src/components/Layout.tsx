import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Heart, Home, LayoutGrid, LogIn, Search, ShoppingBag, UserRound } from 'lucide-react';
import { useAuth } from '../auth/useAuthHook';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { getMarketplaceListings } from '../services/marketplace.service';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, className = '' }) => {
  const { user, profile, logout } = useAuth();
  const { itemCount } = useCart();
  const { count: wishCount } = useWishlist();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const accountPath = !user || !profile
    ? '/login'
    : profile.role === 'admin'
      ? '/admin/dashboard'
      : profile.role === 'vendor'
        ? '/vendor/dashboard'
        : '/orders';
  const isAppChrome = location.pathname.startsWith('/vendor') || location.pathname.startsWith('/admin');
  const showTabbar = !isAppChrome;
  const accountLabel = user && profile
    ? (profile.role === 'admin' ? 'Admin' : profile.role === 'vendor' ? 'Studio' : 'Account')
    : 'Account';

  useEffect(() => {
    setQuery(new URLSearchParams(location.search).get('q') || '');
  }, [location.search]);

  useEffect(() => {
    getMarketplaceListings()
      .then((listings) => {
        setCategories(Array.from(new Set(listings.map((listing) => listing.category).filter((value): value is string => Boolean(value)))));
      })
      .catch(() => setCategories([]));
  }, []);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const next = query.trim();
    navigate(next ? `/marketplace?q=${encodeURIComponent(next)}` : '/marketplace');
  };

  const categoryParam = new URLSearchParams(location.search).get('category');

  const tabs = useMemo(() => ([
    { label: 'Home', to: '/', icon: Home, active: location.pathname === '/' },
    { label: 'Categories', to: '/marketplace', icon: LayoutGrid, active: location.pathname.startsWith('/marketplace') && !location.pathname.startsWith('/marketplace/register') },
    { label: 'Search', to: '/marketplace', icon: Search, active: false, search: true },
    { label: 'Wishlist', to: '/wishlist', icon: Heart, active: location.pathname.startsWith('/wishlist'), badge: wishCount },
    { label: 'Account', to: accountPath, icon: user ? UserRound : LogIn, active: location.pathname.startsWith('/login') || location.pathname.startsWith('/orders') || location.pathname.includes('dashboard') },
  ]), [accountPath, location.pathname, user, wishCount]);

  return (
    <div className={`site-shell min-h-screen overflow-x-hidden bg-ivory text-charcoal ${showTabbar ? 'has-tabbar md:pb-0' : ''} ${className}`}>
      <header className="site-header">
        <div className="mx-auto flex max-w-market items-center gap-3 px-4 py-3 lg:gap-6 lg:px-8">
          <Link to="/" className="brand-mark flex shrink-0 items-center gap-2.5">
            <span className="brand-mark-icon" aria-hidden="true">
              <svg viewBox="0 0 32 32" className="h-8 w-8">
                <path fill="#b85c38" d="M16 3.5c.6 3.6 2.6 6.4 6.1 8.1-3.5 1.6-5.5 4.5-6.1 8.1-.6-3.6-2.6-6.5-6.1-8.1C13.4 9.9 15.4 7.1 16 3.5Zm0 9.2c3.4.7 6.1 3.4 6.8 6.8-3.4.7-6.1 3.4-6.8 6.8-.7-3.4-3.4-6.1-6.8-6.8 3.4-.7 6.1-3.4 6.8-6.8Z" />
              </svg>
            </span>
            <span>
              <span className="brand-mark-word block font-display text-[1.55rem] leading-none tracking-[-0.03em] text-charcoal md:text-[1.8rem]">ARTISAN</span>
              <span className="mt-0.5 hidden text-[10px] font-medium text-stone-600 sm:block">Handmade for a brighter India</span>
            </span>
          </Link>

          <form onSubmit={submitSearch} className="market-search hidden min-w-0 md:flex">
            <Search className="h-4 w-4 shrink-0 text-stone-500" strokeWidth={1.75} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search for pottery, handloom, jewellery, home decor…"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-500"
              aria-label="Search the marketplace"
            />
            <button type="submit" className="market-search-submit" aria-label="Search">
              <Search className="h-4 w-4" strokeWidth={2} />
            </button>
          </form>

          <div className="ml-auto flex items-center gap-1">
            <Link to={accountPath} className={`header-action ${location.pathname.startsWith('/login') || location.pathname.startsWith('/orders') || location.pathname.includes('dashboard') ? 'is-active' : ''}`}>
              <UserRound className="h-5 w-5" strokeWidth={1.75} />
              {accountLabel}
            </Link>
            <Link to="/wishlist" className={`header-action relative ${location.pathname.startsWith('/wishlist') ? 'is-active' : ''}`}>
              <Heart className="h-5 w-5" strokeWidth={1.75} />
              Wishlist
              {wishCount > 0 && <span className="header-badge">{wishCount > 9 ? '9+' : wishCount}</span>}
            </Link>
            <Link to="/cart" className={`header-icon inline-flex md:hidden ${location.pathname.startsWith('/cart') || location.pathname.startsWith('/checkout') ? 'is-active' : ''}`} aria-label="Cart">
              <ShoppingBag className="h-5 w-5" strokeWidth={1.75} />
              {itemCount > 0 && <span className="header-badge">{itemCount > 9 ? '9+' : itemCount}</span>}
            </Link>
            <Link to="/cart" className={`header-action relative ${location.pathname.startsWith('/cart') || location.pathname.startsWith('/checkout') ? 'is-active' : ''}`}>
              <ShoppingBag className="h-5 w-5" strokeWidth={1.75} />
              Cart
              {itemCount > 0 && <span className="header-badge">{itemCount > 9 ? '9+' : itemCount}</span>}
            </Link>
            {user && profile && (
              <button type="button" onClick={() => { void logout(); }} className="header-action">
                <LogIn className="h-5 w-5 rotate-180" strokeWidth={1.75} />
                Sign out
              </button>
            )}
          </div>
        </div>

        <form onSubmit={submitSearch} className="px-4 pb-3 md:hidden">
          <div className="market-search">
            <Search className="h-4 w-4 shrink-0 text-stone-500" strokeWidth={1.75} />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search for handmade products…"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-500"
              aria-label="Search the marketplace"
            />
          </div>
        </form>

        {categories.length > 0 && !isAppChrome && (
          <nav className="category-nav hidden md:block" aria-label="Craft categories">
            <div className="mx-auto flex max-w-market gap-6 overflow-x-auto px-8 py-2.5 hide-scrollbar">
              <Link to="/marketplace" className={`category-link text-[13px] font-medium ${location.pathname.startsWith('/marketplace') && !categoryParam ? 'is-active' : ''}`}>
                All Categories
              </Link>
              {categories.map((category) => (
                <Link
                  key={category}
                  to={`/marketplace?category=${encodeURIComponent(category)}`}
                  className={`category-link text-[13px] font-medium ${categoryParam === category ? 'is-active' : ''}`}
                >
                  {category}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main key={location.pathname} className="page-transition">{children}</main>

      <footer className="mt-8 border-t border-stone-300 bg-sand/60">
        <div className="mx-auto grid max-w-market gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div className="sm:col-span-2">
            <p className="font-display text-3xl tracking-[-0.03em]">ARTISAN</p>
            <p className="mt-3 max-w-md text-sm leading-7 text-stone-600">
              A marketplace for authentic handmade products from India’s artisans — pottery, handloom, jewellery, and regional crafts.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Shop</p>
            <div className="mt-4 flex flex-col gap-2 text-sm text-stone-700">
              <Link to="/marketplace" className="hover:text-terracotta">Marketplace</Link>
              <Link to="/wishlist" className="hover:text-terracotta">Wishlist</Link>
              <Link to="/cart" className="hover:text-terracotta">Cart</Link>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Account</p>
            <div className="mt-4 flex flex-col gap-2 text-sm text-stone-700">
              <Link to="/login" className="hover:text-terracotta">Sign in</Link>
              <Link to="/orders" className="hover:text-terracotta">Orders</Link>
              <Link to="/checkout" className="hover:text-terracotta">Checkout</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-stone-300/80">
          <p className="mx-auto max-w-market px-4 py-4 text-xs text-stone-500 lg:px-8">
            Handmade for a brighter India.
          </p>
        </div>
      </footer>

      {showTabbar && (
        <nav aria-label="Mobile marketplace" className="mobile-tabbar md:hidden">
          {tabs.map((tab) => (
            <Link
              key={tab.label}
              to={tab.to}
              onClick={(event) => {
                if (tab.search) {
                  event.preventDefault();
                  searchRef.current?.focus();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className={`mobile-tab relative ${tab.active ? 'is-active' : ''}`}
            >
              <tab.icon className="h-5 w-5" strokeWidth={1.75} />
              <span>{tab.label}</span>
              {tab.badge ? <span className="header-badge right-1/4 top-1">{tab.badge > 9 ? '9+' : tab.badge}</span> : null}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
};

export default Layout;
