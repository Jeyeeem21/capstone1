import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

// Mock user data - in real app, this would come from your backend
const mockUsers = {
  admin: {
    id: 1,
    email: 'admin@kjpricemill.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    permissions: ['all'],
  },
  staff: {
    id: 2,
    email: 'staff@kjpricemill.com',
    firstName: 'John',
    lastName: 'Smith',
    role: 'staff',
    permissions: ['pos', 'view_inventory'],
  },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('kjp_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Login function
  const login = async (email, password, role = 'admin') => {
    // Mock login - replace with actual API call
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const userData = role === 'admin' ? mockUsers.admin : mockUsers.staff;
        setUser(userData);
        localStorage.setItem('kjp_user', JSON.stringify(userData));
        resolve(userData);
      }, 500);
    });
  };

  // Logout function
  const logout = () => {
    setUser(null);
    localStorage.removeItem('kjp_user');
  };

  // Check if user has a specific role
  const hasRole = (role) => {
    return user?.role === role;
  };

  // Check if user is admin
  const isAdmin = () => {
    return user?.role === 'admin';
  };

  // Check if user is staff
  const isStaff = () => {
    return user?.role === 'staff';
  };

  // Switch role (for demo purposes)
  const switchRole = (role) => {
    const userData = role === 'admin' ? mockUsers.admin : mockUsers.staff;
    setUser(userData);
    localStorage.setItem('kjp_user', JSON.stringify(userData));
  };

  const value = {
    user,
    loading,
    login,
    logout,
    hasRole,
    isAdmin,
    isStaff,
    switchRole,
    isAuthenticated: !!user,
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
