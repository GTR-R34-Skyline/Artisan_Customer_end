import React, { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './components/Login';
import { WeaverLoader } from './components/WeaverLoader';
import { AuthProvider } from './auth/useAuth';
import { useAuth } from './auth/useAuthHook';
import { RoleRoute } from './auth/RoleRoute';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import ArtisansPage from './pages/ArtisansPage';
const HomePage = lazy(() => import('./pages/HomePage'));
const MarketplacePage = lazy(() => import('./pages/MarketplacePage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const CraftsmanPage = lazy(() => import('./pages/CraftsmanPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'));
const CheckoutPaymentPage = lazy(() => import('./pages/CheckoutPaymentPage'));
const OrderConfirmationPage = lazy(() => import('./pages/OrderConfirmationPage'));
const VendorRegistration = lazy(() => import('./components/VendorRegistration'));
const VendorDashboard = lazy(() => import('./components/VendorDashboard'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const VendorOnboarding = lazy(() => import('./components/VendorOnboarding').then((module) => ({ default: module.VendorOnboarding })));
const SimplifiedListingWizard = lazy(() => import('./pages/vendor/SimplifiedListingWizard').then((module) => ({ default: module.SimplifiedListingWizard })));

const PageLoader: React.FC = () => (
  <div className="mx-auto flex min-h-[50vh] max-w-market items-center justify-center px-4 lg:px-8">
    <WeaverLoader label="The loom is at work" />
  </div>
);

const AppContent: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleAdminLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/marketplace/:productId" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/artisans" element={<ArtisansPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/checkout/payment/:orderId" element={<CheckoutPaymentPage />} />
          <Route path="/checkout/confirmation/:orderId" element={<OrderConfirmationPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/orders/:orderId" element={<OrderDetailPage />} />
          <Route path="/craftsman/:id" element={<CraftsmanPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<Navigate to="/login" replace />} />
          <Route path="/join" element={<div className="mx-auto max-w-market px-4 py-10 lg:px-8"><VendorRegistration /></div>} />
          <Route path="/vendor/register" element={<Navigate to="/join" replace />} />
          <Route
            path="/vendor/onboarding"
            element={
              <RoleRoute allowedRoles={['vendor', 'admin']}>
                <VendorOnboarding />
              </RoleRoute>
            }
          />
          <Route
            path="/vendor/dashboard"
            element={
              <RoleRoute allowedRoles={['vendor', 'admin']}>
                <VendorDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/vendor/wizard"
            element={
              <RoleRoute allowedRoles={['vendor', 'admin']}>
                <SimplifiedListingWizard />
              </RoleRoute>
            }
          />
          <Route
            path="/marketplace/register"
            element={
              <RoleRoute allowedRoles={['vendor', 'consumer', 'admin']}>
                <SimplifiedListingWizard />
              </RoleRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <RoleRoute allowedRoles={['admin']}>
                <AdminDashboard onLogout={handleAdminLogout} />
              </RoleRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <CartProvider>
      <WishlistProvider>
        <AppContent />
      </WishlistProvider>
    </CartProvider>
  </AuthProvider>
);

export default App;
