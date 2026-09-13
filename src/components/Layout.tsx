import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Heart, Home, LayoutGrid, LogIn, LogOut, Menu, ShoppingBag, UserRound, X } from 'lucide-react';
import { useAuth } from '../auth/useAuthHook';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getMarketplaceListings } from '../services/marketplace.service';
import { SEARCH_PLACEHOLDER } from '../utils/marketplace';
import { shopCategoriesFromListings, shopCategoryHref } from '../utils/shopCategories';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/marketplace' },
  { label: 'New Arrivals', to: '/marketplace?sort=newest' },
  { label: 'Artisans', to: '/#makers' },
  { label: 'Regions', to: '/#regions' },
];

const Layout: React.FC<LayoutProps> = ({ children, className = '' }) => {
  const { user, profile, logout } = useAuth();
  const { itemCount } = useCart();
  const { count: wishCount } = useWishlist();
  const location = useLocation();
  const navigate = useNavigate();
  const online = useOnlineStatus();
  const [query, setQuery] = useState('');
  const [shopCategories, setShopCategories] = useState(shopCategoriesFromListings([]));
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const accountPath = !user || !profile
    ? '/login'
    : profile.role === 'admin'
      ? '/admin/dashboard'
      : profile.role === 'vendor'
        ? '/vendor/dashboard'
        : '/orders';
  const isAppChrome = location.pathname.startsWith('/vendor') || location.pathname.startsWith('/admin');
  const isProductDetail = /^\/marketplace\/[^/]+$/.test(location.pathname);
  const isCheckoutFlow = location.pathname.startsWith('/checkout');
  const showTabbar = !isAppChrome && !isProductDetail && !isCheckoutFlow;
  const accountLabel = user && profile
    ? (profile.role === 'admin' ? 'Admin' : profile.role === 'vendor' ? 'Studio' : 'Account')
    : 'Sign in';

  useEffect(() => {
    setQuery(new URLSearchParams(location.search).get('q') || '');
  }, [location.search]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    // Prevent a stuck horizontal scroll offset on mobile PWA (overflow from rails/chips).
    window.scrollTo({ left: 0, top: window.scrollY });
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
  }, [location.pathname, location.search]);

  useEffect(() => {
    getMarketplaceListings()
      .then((listings) => setShopCategories(shopCategoriesFromListings(listings)))
      .catch(() => setShopCategories([]));
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const next = query.trim();
    navigate(next ? `/marketplace?q=${encodeURIComponent(next)}` : '/marketplace');
  };

  const categoryParam = new URLSearchParams(location.search).get('category');
  const marketplaceActive = location.pathname.startsWith('/marketplace') && !location.pathname.startsWith('/marketplace/register');

  const tabs = useMemo(() => ([
    { label: 'Home', to: '/', icon: Home, active: location.pathname === '/' },
    { label: 'Explore', to: '/marketplace', icon: LayoutGrid, active: marketplaceActive && !isProductDetail },
    { label: 'Wishlist', to: '/wishlist', icon: Heart, active: location.pathname.startsWith('/wishlist'), badge: wishCount },
    { label: 'Cart', to: '/cart', icon: ShoppingBag, active: location.pathname.startsWith('/cart'), badge: itemCount },
    { label: 'Account', to: accountPath, icon: user ? UserRound : LogIn, active: location.pathname.startsWith('/login') || location.pathname.startsWith('/orders') || location.pathname.includes('dashboard') },
  ]), [accountPath, isProductDetail, itemCount, location.pathname, marketplaceActive, user, wishCount]);

  const BrandMark = (
    <Link to="/" className="brand-mark flex min-w-0 items-center gap-2.5" onClick={() => setMenuOpen(false)}>
      <span className="brand-mark-icon shrink-0" aria-hidden="true">
        <svg viewBox="0 0 32 32" className="h-7 w-7">
          <path d="M16 3.5c.6 3.6 2.6 6.4 6.1 8.1-3.5 1.6-5.5 4.5-6.1 8.1-.6-3.6-2.6-6.5-6.1-8.1C13.4 9.9 15.4 7.1 16 3.5Zm0 9.2c3.4.7 6.1 3.4 6.8 6.8-3.4.7-6.1 3.4-6.8 6.8-.7-3.4-3.4-6.1-6.8-6.8 3.4-.7 6.1-3.4 6.8-6.8Z" />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="brand-mark-word block font-display text-[1.35rem] leading-none tracking-[-0.03em] md:text-[1.65rem]">ARTISAN</span>
        <span className="brand-mark-sub mt-0.5 hidden text-[10px] font-medium tracking-[0.04em] sm:block">Authentic crafts from India</span>
      </span>
    </Link>
  );

  return (
    <div className={`site-shell min-h-screen w-full min-w-0 overflow-x-hidden bg-ivory text-charcoal ${showTabbar ? 'has-tabbar md:pb-0' : ''} ${className}`}>
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="site-header">
        <div className="utility-strip" aria-hidden="true">
          <div className="utility-strip-inner mx-auto max-w-market">
            <span><i className="dot" /> Authentic Indian Crafts</span>
            <span><i className="dot" /> Verified Artisans</span>
            <span><i className="dot" /> Secure Payments</span>
            <span><i className="dot" /> Pan-India Delivery</span>
          </div>
        </div>

        <div className="mobile-header md:hidden">
          <div className="flex items-center gap-1 px-2 py-1.5">
            <button
              type="button"
              className="header-icon inline-flex"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X className="h-5 w-5" strokeWidth={1.75} /> : <Menu className="h-5 w-5" strokeWidth={1.75} />}
            </button>
            <div className="flex min-w-0 flex-1 justify-center px-1">{BrandMark}</div>
            <Link to="/wishlist" className={`header-icon inline-flex ${location.pathname.startsWith('/wishlist') ? 'is-active' : ''}`} aria-label={`Wishlist${wishCount ? `, ${wishCount} saved` : ''}`}>
              <Heart className="h-5 w-5" strokeWidth={1.75} />
              {wishCount > 0 && <span className="header-badge">{wishCount > 9 ? '9+' : wishCount}</span>}
            </Link>
            <Link to="/cart" className={`header-icon inline-flex ${location.pathname.startsWith('/cart') || location.pathname.startsWith('/checkout') ? 'is-active' : ''}`} aria-label={`Cart${itemCount ? `, ${itemCount} items` : ''}`}>
              <ShoppingBag className="h-5 w-5" strokeWidth={1.75} />
              {itemCount > 0 && <span className="header-badge">{itemCount > 9 ? '9+' : itemCount}</span>}
            </Link>
          </div>
          <form onSubmit={submitSearch} className={`px-3 pb-2.5 pt-1 ${isAppChrome ? 'hidden' : ''}`}>
            <div className="market-search market-search-mobile">
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-stone-500" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75" />
                <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={SEARCH_PLACEHOLDER}
                enterKeyHint="search"
                autoCapitalize="none"
                autoCorrect="off"
                className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-stone-500"
                aria-label="Search the marketplace"
              />
            </div>
          </form>
        </div>

        <div className="mx-auto hidden max-w-market items-center gap-3 px-4 py-2.5 md:flex lg:gap-6 lg:px-8">
          {BrandMark}
          <form onSubmit={submitSearch} className="min-w-0 flex-1">
            <div className="market-search w-full">
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-stone-500" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75" />
                <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={SEARCH_PLACEHOLDER}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-500"
                aria-label="Search the marketplace"
              />
              <button type="submit" className="market-search-submit" aria-label="Search">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                  <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </form>
          <div className="ml-auto flex items-center gap-0.5">
            <Link to={accountPath} className={`header-action ${location.pathname.startsWith('/login') || location.pathname.startsWith('/orders') || location.pathname.includes('dashboard') ? 'is-active' : ''}`}>
              <UserRound className="h-5 w-5" strokeWidth={1.75} />
              {accountLabel}
            </Link>
            <Link to="/wishlist" className={`header-action relative ${location.pathname.startsWith('/wishlist') ? 'is-active' : ''}`}>
              <Heart className="h-5 w-5" strokeWidth={1.75} />
              Wishlist
              {wishCount > 0 && <span className="header-badge">{wishCount > 9 ? '9+' : wishCount}</span>}
            </Link>
            <Link to="/cart" className={`header-action relative ${location.pathname.startsWith('/cart') || location.pathname.startsWith('/checkout') ? 'is-active' : ''}`}>
              <ShoppingBag className="h-5 w-5" strokeWidth={1.75} />
              Cart
              {itemCount > 0 && <span className="header-badge">{itemCount > 9 ? '9+' : itemCount}</span>}
            </Link>
            {user && profile && (
              <button type="button" onClick={() => { void logout(); }} className="header-action">
                <LogOut className="h-5 w-5" strokeWidth={1.75} />
                Sign out
              </button>
            )}
          </div>
        </div>

        {!isAppChrome && (
          <nav className="category-nav hidden md:block" aria-label="Marketplace">
            <div className="mx-auto flex max-w-market items-center gap-6 overflow-x-auto px-8 py-2 hide-scrollbar">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`category-link text-[13px] font-medium ${
                    (link.to === '/' && location.pathname === '/')
                    || (link.to === '/marketplace' && marketplaceActive && !categoryParam)
                    || (link.to.includes('newest') && location.search.includes('sort=newest'))
                      ? 'is-active'
                      : ''
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {shopCategories.slice(0, 6).map((group) => (
                <Link
                  key={group.label}
                  to={shopCategoryHref(group)}
                  className={`category-link text-[13px] font-medium ${
                    categoryParam && group.categories.includes(categoryParam) ? 'is-active' : ''
                  }`}
                >
                  {group.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>

      {!online && (
        <div className="offline-banner" role="status">
          You’re offline. Live products and prices are unavailable until you reconnect.
        </div>
      )}

      {menuOpen && (
        <div className="mobile-drawer-root md:hidden">
          <button type="button" className="filter-overlay" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <nav className="mobile-drawer" aria-label="Marketplace menu">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Browse</p>
            {NAV_LINKS.map((link) => (
              <Link key={link.to} to={link.to} className="mobile-drawer-link">{link.label}</Link>
            ))}
            <Link to="/wishlist" className="mobile-drawer-link">Wishlist</Link>
            <Link to="/cart" className="mobile-drawer-link">Cart</Link>
            <Link to={accountPath} className="mobile-drawer-link">{accountLabel}</Link>
            {user && profile && <Link to="/orders" className="mobile-drawer-link">Orders</Link>}
            {shopCategories.length > 0 && (
              <>
                <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">Shop by product</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {shopCategories.map((group) => (
                    <Link key={group.label} to={shopCategoryHref(group)} className="suggestion-chip min-h-11">
                      {group.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
            <Link to="/join" className="mt-6 block text-sm font-semibold text-royal">Become an Artisan</Link>
            {user && profile && (
              <button type="button" onClick={() => { void logout(); setMenuOpen(false); }} className="mt-4 text-sm font-semibold text-stone-600">
                Sign out
              </button>
            )}
          </nav>
        </div>
      )}

      <main id="main-content" key={location.pathname} className="page-transition min-w-0">{children}</main>

      <footer className="site-footer hidden md:block">
        <div className="mx-auto grid max-w-market gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-5 lg:px-8">
          <div className="sm:col-span-2 lg:col-span-2">
            <p className="font-display text-3xl tracking-[-0.03em]">ARTISAN</p>
            <p className="footer-accent mt-2 text-sm font-medium">Preserving India&apos;s heritage, one artisan at a time.</p>
            <p className="mt-3 max-w-md text-sm leading-7 text-[rgba(243,234,204,0.75)]">
              India&apos;s modern marketplace for authentic artisan-made products — shop by what you want to buy, meet the maker, and discover the craft.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Shop</p>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <Link to="/marketplace">All Products</Link>
              <Link to="/marketplace?sort=newest">New Arrivals</Link>
              {shopCategories.slice(0, 4).map((group) => (
                <Link key={group.label} to={shopCategoryHref(group)}>{group.label}</Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Sell</p>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <Link to="/join">Become an Artisan</Link>
              <Link to="/vendor/dashboard">Artisan Dashboard</Link>
              <Link to="/login">Customer Login</Link>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Help</p>
            <div className="mt-4 flex flex-col gap-2 text-sm">
              <Link to="/orders">Track Order</Link>
              <Link to="/cart">Cart</Link>
              <Link to="/wishlist">Wishlist</Link>
              <Link to="/checkout">Checkout</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-[rgba(176,138,69,0.28)]">
          <p className="mx-auto max-w-market px-4 py-4 text-xs text-[rgba(243,234,204,0.55)] lg:px-8">
            © {new Date().getFullYear()} ARTISAN · Authentic crafts, made across India.
          </p>
        </div>
      </footer>

      {showTabbar && (
        <nav aria-label="Mobile marketplace" className="mobile-tabbar md:hidden">
          {tabs.map((tab) => (
            <Link
              key={tab.label}
              to={tab.to}
              className={`mobile-tab relative ${tab.active ? 'is-active' : ''}`}
            >
              <tab.icon className="h-5 w-5" strokeWidth={1.75} />
              <span>{tab.label}</span>
              {tab.badge ? <span className="header-badge right-[18%] top-0.5">{tab.badge > 9 ? '9+' : tab.badge}</span> : null}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
};

export default Layout;
