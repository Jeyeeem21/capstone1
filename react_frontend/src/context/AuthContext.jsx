import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const response = await authApi.getCurrentUser();
          if (response.success && response.user) {
            setUser(response.user);
          } else {
            // Token invalid, clear it
            localStorage.removeItem('auth_token');
          }
        } catch {
          localStorage.removeItem('auth_token');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  // Listen for forced logout from apiClient (401 responses)
  useEffect(() => {
    const handleForcedLogout = () => {
      setUser(null);
      localStorage.removeItem('auth_token');
    };
    window.addEventListener('auth:logout', handleForcedLogout);
    return () => window.removeEventListener('auth:logout', handleForcedLogout);
  }, []);

  // Login function — calls real API
  const login = useCallback(async (email, password) => {
    const response = await authApi.login({ email, password });

    if (response.success && response.user) {
      setUser(response.user);
      return response;
    }

    throw new Error(response.error || 'Login failed');
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Even if API call fails, clear local state
    }
    setUser(null);
    localStorage.removeItem('auth_token');
  }, []);

  // Check if user has a specific role
  const hasRole = useCallback((role) => {
    return user?.role === role;
  }, [user]);

  // Role checks
  const isSuperAdmin = useCallback(() => user?.role === 'super_admin', [user]);
  const isAdmin = useCallback(() => user?.role === 'admin', [user]);
  const isStaff = useCallback(() => user?.role === 'staff', [user]);
  const isAdminOrAbove = useCallback(() => ['super_admin', 'admin'].includes(user?.role), [user]);

  // Refresh user data from API
  const refreshUser = useCallback(async () => {
    try {
      const response = await authApi.getCurrentUser();
      if (response.success && response.user) {
        setUser(response.user);
      }
    } catch {
      // Ignore errors — user stays as-is
    }
  }, []);

  // Base path for admin panel based on role
  const basePath = user?.role === 'super_admin' ? '/superadmin' : '/admin';

  const value = {
    user,
    loading,
    login,
    logout,
    refreshUser,
    hasRole,
    isSuperAdmin,
    isAdmin,
    isAdminOrAbove,
    isStaff,
    isAuthenticated: !!user,
    basePath,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
