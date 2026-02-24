import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout, StaffLayout, PublicLayout, ClientLayout } from './layouts';
import { ToastProvider } from './components/ui';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BusinessSettingsProvider } from './context/BusinessSettingsContext';
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
  Partners,
  Supplier,
  Customer,
  StaffManagement,
  AuditTrail,
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
    // For now, default to admin view. In production, redirect to login
    return <Navigate to="/admin/dashboard" replace />;
  }
  
  if (user?.role === 'staff') {
    return <Navigate to="/staff/dashboard" replace />;
  }
  
  return <Navigate to="/admin/dashboard" replace />;
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
      
      {/* Standalone POS redirect - redirects to admin POS by default */}
      <Route path="/pos" element={<Navigate to="/admin/pos" replace />} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<MainLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        {/* Main Admin Routes */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="procurement" element={<Procurement />} />
        <Route path="drying" element={<DryingProcess />} />
        <Route path="processing" element={<Processing />} />
        
        {/* Products Routes */}
        <Route path="products" element={<Products />} />
        <Route path="products/categories" element={<Varieties />} />
        <Route path="products/inventory" element={<Inventory />} />
        
        {/* Sales Routes */}
        <Route path="sales" element={<Sales />} />
        
        {/* Partners Routes */}
        <Route path="partners" element={<Partners />} />
        <Route path="partners/supplier" element={<Supplier />} />
        <Route path="partners/customer" element={<Customer />} />
        
        {/* Staff Management & Settings (Admin Only) */}
        <Route path="staff-management" element={<StaffManagement />} />
        <Route path="audit-trail" element={<AuditTrail />} />
        <Route path="settings" element={<Settings />} />
        
        {/* POS accessible from admin layout */}
        <Route path="pos" element={<PointOfSale />} />
      </Route>
      
      {/* Staff Routes */}
      <Route path="/staff" element={<StaffLayout />}>
        <Route index element={<Navigate to="/staff/dashboard" replace />} />
        <Route path="dashboard" element={<StaffDashboard />} />
        <Route path="profile" element={<StaffProfile />} />
        <Route path="pos" element={<PointOfSale />} />
      </Route>

      {/* Client Routes */}
      <Route path="/client" element={<ClientLayout />}>
        <Route index element={<Navigate to="/client/dashboard" replace />} />
        <Route path="dashboard" element={<ClientDashboard />} />
        <Route path="shop" element={<Shop />} />
        <Route path="orders" element={<Orders />} />
        <Route path="cart" element={<Cart />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<ClientSettings />} />
      </Route>
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
