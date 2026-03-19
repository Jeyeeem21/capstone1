import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { MainLayout, StaffLayout, PublicLayout, CustomerLayout, DriverLayout } from './layouts';
import { ToastProvider } from './components/ui';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BusinessSettingsProvider, useBusinessSettings } from './context/BusinessSettingsContext';
import { ProtectedRoute, SuperAdminRoute } from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import NotFound from './pages/NotFound';
import {
  // Admin pages
  Dashboard,
  Procurement,
  DryingProcess,
  Processing,
  Products,
  Varieties,
  Inventory,
  Sales,
  AdminOrders,
  Partners,
  Supplier,
  Customer,
  StaffManagement,
  Settings,
  // Shared pages
  PointOfSale,
  // Staff pages
  StaffDashboard,
  StaffProfile,
  // Customer pages
  CustomerDashboard,
  Product,
  Orders,
  Cart,
  Profile,
  CustomerSettings,
  // Driver pages
  DriverDashboard,
  Deliveries,
  DriverProfile,
  DriverSettings,
} from './pages';
// Public pages
import { 
  Home, 
  About, 
  Products as PublicProducts, 
  Contact 
} from './pages/public';

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

  // Safety net: clear body scroll lock on every route change.
  // This catches edge cases where body styles survive a route transition (e.g. login modal).
  useEffect(() => {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
  }, [location.pathname]);

  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<ErrorBoundary><Home /></ErrorBoundary>} />
        <Route path="/about" element={<ErrorBoundary><About /></ErrorBoundary>} />
        <Route path="/products" element={<ErrorBoundary><PublicProducts /></ErrorBoundary>} />
        <Route path="/contact" element={<ErrorBoundary><Contact /></ErrorBoundary>} />
      </Route>
      
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
