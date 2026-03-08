import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Protected Route - requires authentication
export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-button-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/?login=true" state={{ from: location }} replace />;
  }

  // If roles are specified, check if user has the required role
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    // Redirect based on user's role
    if (user?.role === 'staff') {
      if (user?.position === 'Driver') {
        return <Navigate to="/driver/dashboard" replace />;
      }
      return <Navigate to="/staff/pos" replace />;
    }
    if (user?.role === 'client') {
      return <Navigate to="/client/dashboard" replace />;
    }
    if (user?.role === 'super_admin') {
      return <Navigate to="/superadmin/dashboard" replace />;
    }
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};

// Super Admin + Admin Route
export const AdminRoute = ({ children }) => {
  return (
    <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
      {children}
    </ProtectedRoute>
  );
};

// Super Admin Only Route
export const SuperAdminRoute = ({ children }) => {
  return (
    <ProtectedRoute allowedRoles={['super_admin']}>
      {children}
    </ProtectedRoute>
  );
};

// Staff Only Route
export const StaffRoute = ({ children }) => {
  return (
    <ProtectedRoute allowedRoles={['staff']}>
      {children}
    </ProtectedRoute>
  );
};

// Shared Route (Admin and Staff)
export const SharedRoute = ({ children }) => {
  return (
    <ProtectedRoute allowedRoles={['super_admin', 'admin', 'staff']}>
      {children}
    </ProtectedRoute>
  );
};

export default ProtectedRoute;
