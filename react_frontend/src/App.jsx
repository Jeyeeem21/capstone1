import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { ToastProvider } from './components/ui';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BusinessSettingsProvider, useBusinessSettings } from './context/BusinessSettingsContext';
import { ProtectedRoute, SuperAdminRoute } from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import NotFound from './pages/NotFound';

// Lazy-loaded layouts — only the layout for the current route is downloaded
const MainLayout = lazy(() => import('./layouts/MainLayout'));
const StaffLayout = lazy(() => import('./layouts/StaffLayout'));
const PublicLayout = lazy(() => import('./layouts/PublicLayout'));
const CustomerLayout = lazy(() => import('./layouts/CustomerLayout'));
const DriverLayout = lazy(() => import('./layouts/DriverLayout'));

// Lazy-loaded page components — each role's pages are code-split into separate chunks
// so a driver only downloads driver pages, a secretary only downloads staff pages, etc.

// Admin pages
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Procurement = lazy(() => import('./pages/admin/Procurement'));
const DryingProcess = lazy(() => import('./pages/admin/DryingProcess'));
const Processing = lazy(() => import('./pages/admin/Processing'));
const Products = lazy(() => import('./pages/admin/Products'));
const Varieties = lazy(() => import('./pages/admin/Products').then(m => ({ default: m.Varieties })));
const Inventory = lazy(() => import('./pages/admin/Products').then(m => ({ default: m.Inventory })));
const Sales = lazy(() => import('./pages/admin/Sales'));
const AdminOrders = lazy(() => import('./pages/admin/Orders'));
const Partners = lazy(() => import('./pages/admin/Partners'));
const Supplier = lazy(() => import('./pages/admin/Partners').then(m => ({ default: m.Supplier })));
const Customer = lazy(() => import('./pages/admin/Partners').then(m => ({ default: m.Customer })));
const StaffManagement = lazy(() => import('./pages/admin/StaffManagement'));
const Settings = lazy(() => import('./pages/admin/Settings'));

// Shared pages
const PointOfSale = lazy(() => import('./pages/shared/PointOfSale'));

// Staff pages
const StaffDashboard = lazy(() => import('./pages/staff/Dashboard'));
const StaffProfile = lazy(() => import('./pages/staff/Profile'));

// Customer pages
const CustomerDashboard = lazy(() => import('./pages/customer/Dashboard'));
const Product = lazy(() => import('./pages/customer/Product'));
const Orders = lazy(() => import('./pages/customer/Orders'));
const Cart = lazy(() => import('./pages/customer/Cart'));
const Profile = lazy(() => import('./pages/customer/Profile'));
const CustomerSettings = lazy(() => import('./pages/customer/Settings'));

// Driver pages
const DriverDashboard = lazy(() => import('./pages/driver/Dashboard'));
const Deliveries = lazy(() => import('./pages/driver/Deliveries'));
const DriverProfile = lazy(() => import('./pages/driver/Profile'));
const DriverSettings = lazy(() => import('./pages/driver/Settings'));

// Public pages
const Home = lazy(() => import('./pages/public/Home'));
const About = lazy(() => import('./pages/public/About'));
const PublicProducts = lazy(() => import('./pages/public/Products'));
const Contact = lazy(() => import('./pages/public/Contact'));

// Auth pages
const StaffVerification = lazy(() => import('./pages/auth/StaffVerification'));

// Suspense fallback — nothing (ProtectedRoute spinner already covers the wait)
const PageLoader = () => <div className="min-h-[60vh]" />;

// Role-based redirect component
const RoleRedirect = () => {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  if (user?.role === 'staff') {
    if (user?.position === 'Driver') return <Navigate to="/driver/dashboard" replace />;
    return <Navigate to="/secretary/pos" replace />;
  }
  
  if (user?.role === 'customer') {
    return <Navigate to="/customer/dashboard" replace />;
  }
  
  if (user?.role === 'super_admin') {
    return <Navigate to="/superadmin/dashboard" replace />;
  }
  
  return <Navigate to="/admin/dashboard" replace />;
};

// POS redirect based on role
const PosRedirect = () => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/?login=true" replace />;
  if (user?.role === 'super_admin') return <Navigate to="/superadmin/pos" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin/pos" replace />;
  if (user?.role === 'staff') return <Navigate to="/secretary/pos" replace />;
  if (user?.role === 'customer') return <Navigate to="/customer/pos" replace />;
  return <Navigate to="/admin/pos" replace />;
};

function AppRoutes() {
  const location = useLocation();

  // Safety net: clear body scroll lock AND remove orphaned modal backdrop portals
  // on every route change. This catches edge cases where the LoginModal's createPortal
  // overlay (bg-black/60) survives a route transition (e.g. login → admin dashboard).
  useEffect(() => {
    // Clear body scroll lock styles
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';

    // Remove any orphaned modal backdrop portals left in document.body.
    // Modal.jsx renders a portal div with z-[9999] and bg-black/60 directly into body.
    // If React fails to clean it up during route transitions, it stays as a black overlay.
    document.body.querySelectorAll(':scope > div.fixed.inset-0').forEach(el => {
      // Only remove overlay-type divs (high z-index, backdrop overlays)
      const cls = el.className || '';
      if (cls.includes('bg-black') || cls.includes('backdrop')) {
        el.remove();
      }
    });
  }, [location.pathname]);

  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<ErrorBoundary><Home /></ErrorBoundary>} />
        <Route path="/about" element={<ErrorBoundary><About /></ErrorBoundary>} />
        <Route path="/products" element={<ErrorBoundary><PublicProducts /></ErrorBoundary>} />
        <Route path="/contact" element={<ErrorBoundary><Contact /></ErrorBoundary>} />
      </Route>
      
      {/* Auth Routes (public access) */}
      <Route path="/staff/verify" element={<ErrorBoundary><StaffVerification /></ErrorBoundary>} />
      
      {/* Standalone POS redirect */}
      <Route path="/pos" element={<PosRedirect />} />
      
      {/* Super Admin Routes */}
      <Route path="/superadmin" element={
        <ProtectedRoute allowedRoles={['super_admin']}>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/superadmin/dashboard" replace />} />
        <Route path="dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
        <Route path="procurement" element={<ErrorBoundary><Procurement /></ErrorBoundary>} />
        <Route path="drying" element={<ErrorBoundary><DryingProcess /></ErrorBoundary>} />
        <Route path="processing" element={<ErrorBoundary><Processing /></ErrorBoundary>} />
        
        <Route path="products" element={<ErrorBoundary><Products /></ErrorBoundary>} />
        <Route path="products/varieties" element={<ErrorBoundary><Varieties /></ErrorBoundary>} />
        <Route path="products/inventory" element={<ErrorBoundary><Inventory /></ErrorBoundary>} />
        
        <Route path="sales" element={<ErrorBoundary><Sales /></ErrorBoundary>} />
        
        <Route path="partners" element={<ErrorBoundary><Partners /></ErrorBoundary>} />
        <Route path="partners/supplier" element={<ErrorBoundary><Supplier /></ErrorBoundary>} />
        <Route path="partners/customer" element={<ErrorBoundary><Customer /></ErrorBoundary>} />
        
        <Route path="staff-management" element={<ErrorBoundary><StaffManagement /></ErrorBoundary>} />
        <Route path="settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
        
        <Route path="pos" element={<ErrorBoundary><PointOfSale /></ErrorBoundary>} />
        <Route path="orders" element={<ErrorBoundary><AdminOrders /></ErrorBoundary>} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Admin Routes (Admin only) */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
        <Route path="procurement" element={<ErrorBoundary><Procurement /></ErrorBoundary>} />
        <Route path="drying" element={<ErrorBoundary><DryingProcess /></ErrorBoundary>} />
        <Route path="processing" element={<ErrorBoundary><Processing /></ErrorBoundary>} />
        
        <Route path="products" element={<ErrorBoundary><Products /></ErrorBoundary>} />
        <Route path="products/varieties" element={<ErrorBoundary><Varieties /></ErrorBoundary>} />
        <Route path="products/inventory" element={<ErrorBoundary><Inventory /></ErrorBoundary>} />
        
        <Route path="sales" element={<ErrorBoundary><Sales /></ErrorBoundary>} />
        
        <Route path="partners" element={<ErrorBoundary><Partners /></ErrorBoundary>} />
        <Route path="partners/supplier" element={<ErrorBoundary><Supplier /></ErrorBoundary>} />
        <Route path="partners/customer" element={<ErrorBoundary><Customer /></ErrorBoundary>} />
        
        <Route path="staff-management" element={<ErrorBoundary><StaffManagement /></ErrorBoundary>} />
        <Route path="settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
        
        <Route path="pos" element={<ErrorBoundary><PointOfSale /></ErrorBoundary>} />
        <Route path="orders" element={<ErrorBoundary><AdminOrders /></ErrorBoundary>} />
        <Route path="*" element={<NotFound />} />
      </Route>
      
      {/* Secretary Routes (Secretary staff only) */}
      <Route path="/secretary" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'staff']} allowedPositions={['Secretary']}>
          <StaffLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/secretary/pos" replace />} />
        <Route path="dashboard" element={<ErrorBoundary><StaffDashboard /></ErrorBoundary>} />
        <Route path="profile" element={<ErrorBoundary><StaffProfile /></ErrorBoundary>} />
        <Route path="pos" element={<ErrorBoundary><PointOfSale /></ErrorBoundary>} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Customer Routes */}
      <Route path="/customer" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'staff', 'customer']}>
          <CustomerLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/customer/dashboard" replace />} />
        <Route path="dashboard" element={<ErrorBoundary><CustomerDashboard /></ErrorBoundary>} />
        <Route path="products" element={<ErrorBoundary><Product /></ErrorBoundary>} />
        <Route path="orders" element={<ErrorBoundary><Orders /></ErrorBoundary>} />
        <Route path="cart" element={<ErrorBoundary><Cart /></ErrorBoundary>} />
        <Route path="profile" element={<ErrorBoundary><Profile /></ErrorBoundary>} />
        <Route path="settings" element={<ErrorBoundary><CustomerSettings /></ErrorBoundary>} />
        <Route path="pos" element={<ErrorBoundary><PointOfSale /></ErrorBoundary>} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Driver Routes */}
      <Route path="/driver" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'driver', 'staff']}>
          <DriverLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/driver/dashboard" replace />} />
        <Route path="dashboard" element={<ErrorBoundary><DriverDashboard /></ErrorBoundary>} />
        <Route path="deliveries" element={<ErrorBoundary><Deliveries /></ErrorBoundary>} />
        <Route path="profile" element={<ErrorBoundary><DriverProfile /></ErrorBoundary>} />
        <Route path="settings" element={<ErrorBoundary><DriverSettings /></ErrorBoundary>} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Catch-all: 404 page */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}

// Dynamic document title & favicon from business settings
const DynamicHead = () => {
  const { settings } = useBusinessSettings();
  const location = useLocation();

  useEffect(() => {
    const name = settings.business_name || 'KJP Ricemill';
    const path = location.pathname;
    let page = '';
    if (path === '/' || path === '') page = 'Home';
    else if (path.startsWith('/about')) page = 'About';
    else if (path.startsWith('/products')) page = 'Products';
    else if (path.startsWith('/contact')) page = 'Contact';
    else if (path.includes('/dashboard')) page = 'Dashboard';
    else if (path.includes('/pos')) page = 'Point of Sale';
    else if (path.includes('/orders')) page = 'Orders';
    else if (path.includes('/products')) page = 'Products';
    else if (path.includes('/procurement')) page = 'Procurement';
    else if (path.includes('/sales')) page = 'Sales';
    else if (path.includes('/inventory')) page = 'Inventory';
    else if (path.includes('/drying')) page = 'Drying';
    else if (path.includes('/settings')) page = 'Settings';
    else if (path.includes('/profile')) page = 'Profile';
    else if (path.includes('/deliveries')) page = 'Deliveries';
    else if (path.includes('/partners')) page = 'Partners';
    else if (path.includes('/predictive')) page = 'Predictive Analysis';
    else if (path.includes('/products') && path.includes('/customer')) page = 'Products';
    document.title = page ? `${page} | ${name}` : name;
  }, [settings.business_name, location.pathname]);

  useEffect(() => {
    if (settings.business_logo) {
      const link = document.querySelector("link[rel~='icon']");
      if (link) link.href = settings.business_logo;
    }
  }, [settings.business_logo]);

  return null;
};

function App() {
  return (
    <AuthProvider>
      <BusinessSettingsProvider>
        <ToastProvider>
          <BrowserRouter>
            <DynamicHead />
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </BusinessSettingsProvider>
    </AuthProvider>
  );
}

export default App;
