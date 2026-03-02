import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout, StaffLayout, PublicLayout, ClientLayout, DriverLayout } from './layouts';
import { ToastProvider } from './components/ui';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BusinessSettingsProvider } from './context/BusinessSettingsContext';
import { ProtectedRoute, SuperAdminRoute } from './components/auth/ProtectedRoute';
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
    return <Navigate to="/staff/dashboard" replace />;
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
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/products" element={<PublicProducts />} />
        <Route path="/contact" element={<Contact />} />
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
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="procurement" element={<Procurement />} />
        <Route path="drying" element={<DryingProcess />} />
        <Route path="processing" element={<Processing />} />
        
        <Route path="products" element={<Products />} />
        <Route path="products/varieties" element={<Varieties />} />
        <Route path="products/inventory" element={<Inventory />} />
        
        <Route path="sales" element={<Sales />} />
        
        <Route path="partners" element={<Partners />} />
        <Route path="partners/supplier" element={<Supplier />} />
        <Route path="partners/customer" element={<Customer />} />
        
        <Route path="staff-management" element={<StaffManagement />} />
        <Route path="settings" element={<Settings />} />
        
        <Route path="pos" element={<PointOfSale />} />
        <Route path="orders" element={<AdminOrders />} />
      </Route>

      {/* Admin Routes (Admin only) */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="procurement" element={<Procurement />} />
        <Route path="drying" element={<DryingProcess />} />
        <Route path="processing" element={<Processing />} />
        
        <Route path="products" element={<Products />} />
        <Route path="products/varieties" element={<Varieties />} />
        <Route path="products/inventory" element={<Inventory />} />
        
        <Route path="sales" element={<Sales />} />
        
        <Route path="partners" element={<Partners />} />
        <Route path="partners/supplier" element={<Supplier />} />
        <Route path="partners/customer" element={<Customer />} />
        
        <Route path="staff-management" element={<StaffManagement />} />
        <Route path="settings" element={<Settings />} />
        
        <Route path="pos" element={<PointOfSale />} />
        <Route path="orders" element={<AdminOrders />} />
      </Route>
      
      {/* Staff Routes */}
      <Route path="/staff" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'staff']}>
          <StaffLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/staff/dashboard" replace />} />
        <Route path="dashboard" element={<StaffDashboard />} />
        <Route path="profile" element={<StaffProfile />} />
        <Route path="pos" element={<PointOfSale />} />
      </Route>

      {/* Client Routes */}
      <Route path="/client" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'staff', 'client']}>
          <ClientLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/client/dashboard" replace />} />
        <Route path="dashboard" element={<ClientDashboard />} />
        <Route path="shop" element={<Shop />} />
        <Route path="orders" element={<Orders />} />
        <Route path="cart" element={<Cart />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<ClientSettings />} />
        <Route path="pos" element={<PointOfSale />} />
      </Route>

      {/* Driver Routes */}
      <Route path="/driver" element={
        <ProtectedRoute allowedRoles={['super_admin', 'admin', 'driver']}>
          <DriverLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/driver/dashboard" replace />} />
        <Route path="dashboard" element={<DriverDashboard />} />
        <Route path="deliveries" element={<Deliveries />} />
        <Route path="profile" element={<DriverProfile />} />
        <Route path="settings" element={<DriverSettings />} />
      </Route>

      {/* Catch-all: redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BusinessSettingsProvider>
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
