import { useState, useEffect } from 'react';
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, X, Phone, Mail, 
  ChevronDown, LogOut, Home, 
  Truck, ClipboardList, User, Settings, LayoutDashboard, MapPin
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useBusinessSettings } from '../../context/BusinessSettingsContext';

// Driver data — will connect to real auth
const mockDriver = {
  id: 0,
  name: 'Driver',
  email: '',
  phone: '',
  license_number: '',
  vehicle_type: '',
  plate_number: '',
  address: '',
};

// Mobile Bottom Navigation
const DriverBottomNav = () => {
  const location = useLocation();
  const { theme } = useTheme();

  const navItems = [
    { to: '/driver', label: 'Home', icon: LayoutDashboard, exact: true },
    { to: '/driver/deliveries', label: 'Deliveries', icon: Truck },
    { to: '/driver/profile', label: 'Profile', icon: User },
    { to: '/driver/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t"
      style={{ backgroundColor: '#fff', borderColor: theme.border_color }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = item.exact 
            ? location.pathname === item.to || location.pathname === '/driver/dashboard'
            : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className="flex flex-col items-center justify-center min-w-[64px] px-3 py-1.5 rounded-xl transition-all duration-200 relative"
              style={isActive ? { 
                backgroundColor: theme.button_primary, 
                color: '#fff',
                boxShadow: `0 4px 12px ${theme.button_primary}40`
              } : { 
                color: theme.text_secondary 
              }}
            >
              <item.icon size={20} />
              <span className={`text-[10px] mt-0.5 font-medium ${isActive ? 'text-white' : ''}`}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

// Driver Header/Navbar
const DriverHeader = ({ driver }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { settings } = useBusinessSettings();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest('.profile-dropdown')) setIsProfileOpen(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const navLinks = [
    { to: '/driver', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/driver/deliveries', label: 'My Deliveries', icon: Truck },
    { to: '/driver/profile', label: 'Profile', icon: User },
    { to: '/driver/settings', label: 'Settings', icon: Settings },
  ];

  const businessName = settings?.business_name || 'KJP Ricemill';

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white dark:bg-gray-700 shadow-lg border-b' : 'bg-white dark:bg-gray-700 shadow-sm border-b'
      }`}
      style={{ borderColor: theme.border_color }}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Hamburger (tablet) + Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="hidden md:block lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 dark:bg-gray-700 transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={24} style={{ color: theme.text_primary }} /> : <Menu size={24} style={{ color: theme.text_primary }} />}
            </button>

            <Link to="/driver" className="flex items-center gap-3 group">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform"
                style={{ background: `linear-gradient(135deg, ${theme.button_primary}, ${theme.button_primary}dd)` }}
              >
                <Truck size={20} className="text-white" />
              </div>
              <div>
                <h1 className="font-bold text-sm sm:text-lg leading-tight" style={{ color: theme.text_primary }}>
                  {businessName}
                </h1>
                <p className="text-[10px] sm:text-xs font-medium hidden sm:block" style={{ color: theme.text_secondary }}>
                  Driver Portal
                </p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation (lg+) */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.exact}
                className={({ isActive }) => `
                  flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
                  ${isActive ? 'text-white shadow-md' : 'hover:bg-gray-100 dark:hover:bg-gray-600 dark:bg-gray-700'}
                `}
                style={({ isActive }) => isActive ? { 
                  backgroundColor: theme.button_primary,
                } : { 
                  color: theme.text_primary 
                }}
              >
                <link.icon size={16} />
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Right side - Profile */}
          <div className="flex items-center gap-2">
            <div className="relative profile-dropdown">
              <button
                onClick={(e) => { e.stopPropagation(); setIsProfileOpen(!isProfileOpen); }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 dark:bg-gray-700 transition-colors"
              >
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                  style={{ backgroundColor: theme.button_primary }}
                >
                  {driver.name.charAt(0)}
                </div>
                <span className="hidden sm:block text-sm font-medium" style={{ color: theme.text_primary }}>
                  {driver.name.split(' ')[0]}
                </span>
                <ChevronDown size={14} className={`hidden sm:block transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} style={{ color: theme.text_secondary }} />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-700 rounded-xl shadow-xl border py-2 z-50" style={{ borderColor: theme.border_color }}>
                  <div className="px-4 py-3 border-b" style={{ borderColor: theme.border_color }}>
                    <p className="text-sm font-semibold" style={{ color: theme.text_primary }}>{driver.name}</p>
                    <p className="text-xs" style={{ color: theme.text_secondary }}>{driver.email}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Truck size={11} style={{ color: theme.text_secondary }} />
                      <p className="text-[10px]" style={{ color: theme.text_secondary }}>{driver.vehicle_type} · {driver.plate_number}</p>
                    </div>
                  </div>
                  <Link
                    to="/driver/deliveries"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-600 dark:bg-gray-700/50 transition-colors"
                    style={{ color: theme.text_primary }}
                  >
                    <ClipboardList size={16} />
                    My Deliveries
                  </Link>
                  <div className="border-t my-1" style={{ borderColor: theme.border_color }} />
                  <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tablet Menu Overlay (md to lg) */}
      <div className={`hidden md:block lg:hidden transition-all duration-300 overflow-hidden ${
        isMobileMenuOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="bg-white dark:bg-gray-700 border-t shadow-lg" style={{ borderColor: theme.border_color }}>
          <nav className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.exact}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all duration-200
                  ${isActive ? 'text-white' : 'hover:bg-gray-50 dark:hover:bg-gray-600 dark:bg-gray-700/50'}
                `}
                style={({ isActive }) => isActive ? { 
                  backgroundColor: theme.button_primary 
                } : { 
                  color: theme.text_primary 
                }}
              >
                <link.icon size={18} />
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
};

// Driver Footer
const DriverFooter = () => {
  const { theme } = useTheme();
  const { settings } = useBusinessSettings();

  return (
    <footer 
      className="border-t py-6"
      style={{ 
        backgroundColor: theme.bg_footer || '#111827',
        borderColor: theme.border_color
      }}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} {settings?.business_name || 'KJP Ricemill'}. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {settings?.business_phone && (
              <a href={`tel:${settings.business_phone}`} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-300 transition-colors">
                <Phone size={12} />
                {settings.business_phone}
              </a>
            )}
            {settings?.business_email && (
              <a href={`mailto:${settings.business_email}`} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-300 transition-colors">
                <Mail size={12} />
                {settings.business_email}
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

// Main Driver Layout
const DriverLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-700/50">
      <DriverHeader driver={mockDriver} />
      <main className="flex-1 pt-16 pb-20 md:pb-0">
        <Outlet />
      </main>
      <DriverFooter />
      <DriverBottomNav />
    </div>
  );
};

export default DriverLayout;
