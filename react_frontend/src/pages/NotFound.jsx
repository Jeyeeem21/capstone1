import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * NotFound (404) page — shown when users navigate to a route that doesn't exist.
 * Provides helpful navigation back to valid sections of the app.
 */
const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  const getDashboardPath = () => {
    if (!isAuthenticated || !user) return '/';
    const roleMap = {
      super_admin: '/superadmin/dashboard',
      admin: '/admin/dashboard',
      staff: '/staff/dashboard',
      client: '/client/dashboard',
      driver: '/driver/dashboard',
    };
    return roleMap[user.role] || '/';
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* 404 illustration */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-primary-100 dark:bg-gray-700 flex items-center justify-center">
              <Search size={56} className="text-primary-400 dark:text-gray-500" />
            </div>
            <div className="absolute -top-2 -right-2 w-12 h-12 rounded-full bg-button-500 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">?</span>
            </div>
          </div>
        </div>

        {/* Text */}
        <h1 className="text-6xl font-extrabold text-button-500 mb-2">404</h1>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          Page Not Found
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-2">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mb-8 font-mono break-all">
          {location.pathname}
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate(getDashboardPath())}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-button-500 hover:bg-button-600 text-white font-medium rounded-xl transition-colors"
          >
            <Home size={18} />
            {isAuthenticated ? 'Go to Dashboard' : 'Go Home'}
          </button>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-6 py-2.5 border-2 border-primary-300 dark:border-primary-700 hover:bg-primary-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-colors"
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
