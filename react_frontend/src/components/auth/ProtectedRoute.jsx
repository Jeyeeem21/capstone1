import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
    // Redirect to login page, preserving the intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If roles are specified, check if user has the required role
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    // Redirect based on user's role
    if (user?.role === 'staff') {
      return <Navigate to="/staff/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Admin Only Route
export const AdminRoute = ({ children }) => {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
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
    <ProtectedRoute allowedRoles={['admin', 'staff']}>
      {children}
    </ProtectedRoute>
  );
};

export default ProtectedRoute;
