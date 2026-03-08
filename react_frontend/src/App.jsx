import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { MainLayout, StaffLayout, PublicLayout, ClientLayout, DriverLayout } from './layouts';
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
  Client,
  StaffManagement,
  Settings,
  // Shared pages
  PointOfSale,
  // Staff pages
  StaffDashboard,
  StaffProfile,
  // Client pages
  ClientDashboard,
  Shop,
  Orders,
  Cart,
  Profile,
  ClientSettings,
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
    return <Navigate to="/staff/pos" replace />;
  }
  
  if (user?.role === 'client') {
    return <Navigate to="/client/dashboard" replace />;
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
  if (user?.role === 'staff') return <Navigate to="/staff/pos" replace />;
  if (user?.role === 'client') return <Navigate to="/client/pos" replace />;
  return <Navigate to="/admin/pos" replace />;
};

function AppRoutes() {
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
        <Route path="partners/client" element={<ErrorBoundary><Client /></ErrorBoundary>} />
        
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
        <Route path="partners/client" element={<ErrorBoundary><Client /></ErrorBoundary>} />
        
        <Route path="staff-management" element={<ErrorBoundary><StaffManagement /></ErrorBoundary>} />
        <Route path="settings" element={<ErrorBoundary><Settings /></ErrorBoundary>} />
        
        <Route path="pos" element={<ErrorBoundary><PointOfSale /></ErrorBoundary>} />
        <Route path="orders" element={<ErrorBoundary><AdminOrders /></ErrorBoundary>} />
        <Route path="*" element={<NotFound />} />
      </Route>
      
      {/* Staff Routes */}
      <Route path="/staff" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'staff']}>
          <StaffLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/staff/pos" replace />} />
        <Route path="dashboard" element={<ErrorBoundary><StaffDashboard /></ErrorBoundary>} />
        <Route path="profile" element={<ErrorBoundary><StaffProfile /></ErrorBoundary>} />
        <Route path="pos" element={<ErrorBoundary><PointOfSale /></ErrorBoundary>} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Client Routes */}
      <Route path="/client" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'staff', 'client']}>
          <ClientLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/client/dashboard" replace />} />
        <Route path="dashboard" element={<ErrorBoundary><ClientDashboard /></ErrorBoundary>} />
        <Route path="shop" element={<ErrorBoundary><Shop /></ErrorBoundary>} />
        <Route path="orders" element={<ErrorBoundary><Orders /></ErrorBoundary>} />
        <Route path="cart" element={<ErrorBoundary><Cart /></ErrorBoundary>} />
        <Route path="profile" element={<ErrorBoundary><Profile /></ErrorBoundary>} />
        <Route path="settings" element={<ErrorBoundary><ClientSettings /></ErrorBoundary>} />
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

  useEffect(() => {
    if (settings.business_name) {
      document.title = settings.business_name;
    }
  }, [settings.business_name]);

  useEffect(() => {
    if (settings.business_logo && settings.business_logo !== '/logo.svg') {
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
        <DynamicHead />
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </BusinessSettingsProvider>
    </AuthProvider>
  );
}

export default App;
