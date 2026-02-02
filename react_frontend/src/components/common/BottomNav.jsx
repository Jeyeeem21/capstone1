import { useRef, useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Settings2, 
  Package, 
  TrendingUp, 
  Monitor, 
  Users, 
  UserCog, 
  Settings,
  ClipboardList,
  Tag,
  Warehouse,
  Truck,
  UserCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [expandedMenu, setExpandedMenu] = useState(null);

  // Auto-expand submenu when on Products or Partners page
  useEffect(() => {
    if (location.pathname.startsWith('/admin/products')) {
      setExpandedMenu('products');
    } else if (location.pathname.startsWith('/admin/partners')) {
      setExpandedMenu('partners');
    } else {
      setExpandedMenu(null);
    }
  }, [location.pathname]);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', to: '/admin/dashboard' },
    { icon: ShoppingCart, label: 'Procurement', to: '/admin/procurement' },
    { icon: Settings2, label: 'Processing', to: '/admin/processing' },
    { 
      icon: Package, 
      label: 'Products', 
      to: '/admin/products',
      hasSubmenu: true,
      submenuId: 'products',
      submenu: [
        { icon: Tag, label: 'Categories', to: '/admin/products/categories' },
        { icon: Warehouse, label: 'Inventory', to: '/admin/products/inventory' },
      ]
    },
    { icon: TrendingUp, label: 'Sales', to: '/admin/sales' },
    { icon: Monitor, label: 'POS', to: '/admin/pos' },
    { 
      icon: Users, 
      label: 'Partners', 
      to: '/admin/partners',
      hasSubmenu: true,
      submenuId: 'partners',
      submenu: [
        { icon: Truck, label: 'Supplier', to: '/admin/partners/supplier' },
        { icon: UserCheck, label: 'Customer', to: '/admin/partners/customer' },
      ]
    },
    { icon: UserCog, label: 'Staff', to: '/admin/staff-management' },
    { icon: ClipboardList, label: 'Audit', to: '/admin/audit-trail' },
    { icon: Settings, label: 'Settings', to: '/admin/settings' },
  ];

  const handleMenuItemClick = (item) => {
    if (item.hasSubmenu) {
      // Navigate to the page first
      navigate(item.to);
      // Then expand the submenu (useEffect will handle this)
    }
  };

  const toggleSubmenu = () => {
    setExpandedMenu(null);
  };

  return (
    <>
      {/* Expanded Submenu Overlay */}
      {expandedMenu && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleSubmenu}
        />
      )}

      {/* Submenu Panel */}
      {expandedMenu && (
        <div 
          className="fixed bottom-16 left-0 right-0 z-50 md:hidden animate-slide-up"
          style={{ backgroundColor: 'var(--color-bg-sidebar)' }}
        >
          <div className="border-t-2 border-primary-300 py-2 px-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {navItems.find(item => item.submenuId === expandedMenu)?.label}
              </h3>
              <button 
                onClick={toggleSubmenu}
                className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <ChevronDown size={18} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {navItems
                .find(item => item.submenuId === expandedMenu)
                ?.submenu.map((subItem) => {
                  const isActive = location.pathname === subItem.to;
                  return (
                    <NavLink
                      key={subItem.to}
                      to={subItem.to}
                      onClick={toggleSubmenu}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-all duration-200
                        ${isActive 
                          ? 'bg-gradient-to-r from-button-500 to-button-400 text-white shadow-md' 
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 active:bg-gray-200 dark:active:bg-gray-700'
                        }`}
                    >
                      <subItem.icon size={18} />
                      <span className="text-sm font-medium">{subItem.label}</span>
                    </NavLink>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      <nav 
        className="fixed bottom-0 left-0 right-0 border-t-2 border-primary-300 z-50 md:hidden safe-area-bottom"
        style={{ backgroundColor: 'var(--color-bg-sidebar)' }}
      >
        {/* Scrollable nav items - naturally scrollable with touch */}
        <div 
          ref={scrollRef}
          className="flex items-center overflow-x-scroll scrollbar-hide px-2 py-2 gap-1"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'smooth',
            touchAction: 'pan-x'
          }}
        >
          {navItems.map((item) => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
            
            // For items with submenus, make them expandable
            if (item.hasSubmenu) {
              return (
                <button
                  key={item.to}
                  onClick={() => handleMenuItemClick(item)}
                  className={`flex flex-col items-center justify-center min-w-[64px] px-3 py-2 rounded-xl transition-all duration-200 flex-shrink-0 relative
                    ${isActive 
                      ? 'bg-gradient-to-t from-button-500 to-button-400 text-white shadow-lg shadow-button-500/25' 
                      : 'text-gray-500 dark:text-gray-400 active:bg-primary-100 dark:active:bg-gray-700'
                    }`}
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <div className="relative">
                    <item.icon size={22} className={isActive ? 'text-white' : ''} />
                    {isActive && (
                      <ChevronUp 
                        size={12} 
                        className={`absolute -top-1 -right-2 text-white ${expandedMenu === item.submenuId ? 'rotate-180' : ''} transition-transform`}
                      />
                    )}
                  </div>
                  <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-white' : ''}`}>
                    {item.label}
                  </span>
                </button>
              );
            }

            // Regular nav items
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center min-w-[64px] px-3 py-2 rounded-xl transition-all duration-200 flex-shrink-0
                  ${isActive 
                    ? 'bg-gradient-to-t from-button-500 to-button-400 text-white shadow-lg shadow-button-500/25' 
                    : 'text-gray-500 dark:text-gray-400 active:bg-primary-100 dark:active:bg-gray-700'
                  }`}
                style={{ scrollSnapAlign: 'start' }}
              >
                <item.icon size={22} className={isActive ? 'text-white' : ''} />
                <span className={`text-[10px] mt-1 font-medium ${isActive ? 'text-white' : ''}`}>
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default BottomNav;
