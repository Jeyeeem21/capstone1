import { useState, useRef, useEffect } from 'react';
import { Menu, User, LogOut, Settings, ChevronDown, Wheat } from 'lucide-react';

const Header = ({ onMenuClick, businessName = 'KJP Rice Mill' }) => {
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header 
      className="border-b-2 border-primary-300 px-4 py-3 flex items-center justify-between shadow-sm lg:hidden"
      style={{ backgroundColor: 'var(--color-bg-sidebar)' }}
    >
      {/* Left: Hamburger (tablet only) + Logo */}
      <div className="flex items-center gap-3">
        {/* Hamburger button - only show on tablet (md to lg) */}
        <button
          onClick={onMenuClick}
          className="hidden md:block p-2 rounded-lg hover:bg-primary-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Toggle menu"
        >
          <Menu size={24} className="text-gray-700 dark:text-gray-200" />
        </button>
        
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-button-500 to-button-600 rounded-lg flex items-center justify-center shadow-md">
            <Wheat size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-800 dark:text-white text-base leading-tight">{businessName}</h1>
            <p className="text-xs text-primary-500 font-medium">Management System</p>
          </div>
        </div>
      </div>

      {/* Right: Account Icon with Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsAccountOpen(!isAccountOpen)}
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-primary-100 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="w-9 h-9 bg-gradient-to-br from-button-500 to-button-600 rounded-full flex items-center justify-center shadow-md">
            <User size={18} className="text-white" />
          </div>
          <ChevronDown 
            size={16} 
            className={`text-gray-500 dark:text-gray-400 transition-transform hidden sm:block ${isAccountOpen ? 'rotate-180' : ''}`} 
          />
        </button>

        {/* Dropdown Menu */}
        {isAccountOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl border-2 border-primary-300 dark:border-gray-700 shadow-xl z-50 overflow-hidden animate-fadeIn">
            {/* User Info */}
            <div className="p-4 border-b border-primary-100 dark:border-gray-700 bg-gradient-to-r from-primary-50 to-white dark:from-gray-700 dark:to-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-button-500 to-button-600 rounded-full flex items-center justify-center shadow-md">
                  <User size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">Admin User</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">admin@kjpricemill.com</p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2">
              <button className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-primary-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <Settings size={18} className="text-gray-500 dark:text-gray-400" />
                Account Settings
              </button>
              <button className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-button-500 hover:bg-button-600 text-white text-sm font-medium rounded-lg transition-colors mt-1">
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
