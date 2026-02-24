import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
  Tag,
  Warehouse,
  Truck,
  UserCheck,
  ChevronLeft,
  LogOut,
  X,
  ClipboardList,
  Sun
} from 'lucide-react';
import { Avatar } from '../ui';
import SidebarMenuItem from './SidebarMenuItem';
import SidebarSubMenuItem from './SidebarSubMenuItem';
import { useBusinessSettings } from '../../context/BusinessSettingsContext';

const Sidebar = ({ isCollapsed, onToggleCollapse, isMobileOpen, onMobileClose }) => {
  const location = useLocation();
  const { settings } = useBusinessSettings();
  const [openMenus, setOpenMenus] = useState({
    products: false,
    partners: false,
  });

  // Auto-expand menus based on current route
  useEffect(() => {
    if (location.pathname.includes('/admin/products')) {
      setOpenMenus(prev => ({ ...prev, products: true }));
    }
    if (location.pathname.includes('/admin/partners')) {
      setOpenMenus(prev => ({ ...prev, partners: true }));
    }
  }, [location.pathname]);

  // Close mobile sidebar when route changes
  useEffect(() => {
    if (onMobileClose) {
      onMobileClose();
    }
  }, [location.pathname]);

  const toggleMenu = (menu) => {
    setOpenMenus(prev => ({
      ...prev,
      [menu]: !prev[menu]
    }));
  };

  return (
    <>
      {/* Backdrop for mobile/tablet */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}
      
      <aside 
        className={`
          fixed left-0 top-0 h-screen border-r-2 border-primary-300 
          flex flex-col transition-all duration-300 z-50
          shadow-[4px_0_20px_-3px_rgba(0,0,0,0.2)]
          w-72
          ${isCollapsed ? 'lg:w-20' : 'lg:w-72'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
        style={{ backgroundColor: 'var(--color-bg-sidebar)', color: 'var(--color-text-sidebar)' }}
      >
      {/* Header / Logo */}
      <div className="p-4 border-b-2 border-primary-200">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 bg-gradient-to-br from-button-500 to-button-600 rounded-xl flex items-center justify-center shadow-lg shadow-button-500/25 overflow-hidden flex-shrink-0"
          >
            <img 
              src={settings.business_logo && !settings.business_logo.startsWith('blob:') ? settings.business_logo : '/logo.svg'} 
              alt={settings.business_name || 'Business Logo'} 
              className="w-8 h-8 object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <span className="hidden text-white font-bold text-lg">{settings.business_name?.substring(0, 3) || 'KJP'}</span>
          </div>
          {/* Mobile/Tablet: Close button */}
          <div className="flex-1 min-w-0 lg:hidden">
            <h1 className="font-bold text-lg leading-tight" style={{ color: 'var(--color-text-sidebar)' }}>{settings.business_name || 'KJP Ricemill'}</h1>
            <p className="text-xs text-primary-500 font-medium">{settings.business_tagline || 'Inventory & Sales'}</p>
          </div>
          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-lg hover:bg-primary-100 transition-colors bg-primary-50 flex-shrink-0 lg:hidden"
            title="Close sidebar"
          >
            <X size={18} className="text-primary-500" />
          </button>
          {/* Desktop: Show ">" button beside logo when collapsed */}
          {isCollapsed && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg hover:bg-primary-100 transition-colors bg-primary-50 flex-shrink-0 hidden lg:block"
              title="Expand sidebar"
            >
              <ChevronLeft size={18} className="text-primary-500 rotate-180" />
            </button>
          )}
          {/* Desktop: Show title and "<" button at edge when expanded */}
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0 hidden lg:block">
                <h1 className="font-bold text-lg leading-tight" style={{ color: 'var(--color-text-sidebar)' }}>{settings.business_name || 'KJP Ricemill'}</h1>
                <p className="text-xs text-primary-500 font-medium">{settings.business_tagline || 'Inventory & Sales'}</p>
              </div>
              <button
                onClick={onToggleCollapse}
                className="p-1.5 rounded-lg hover:bg-primary-100 transition-colors bg-primary-50 flex-shrink-0 hidden lg:block"
                title="Collapse sidebar"
              >
                <ChevronLeft size={18} className="text-primary-500" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto scrollbar-hide">
        <div className="space-y-1">
          {/* Dashboard */}
          <SidebarMenuItem
            icon={LayoutDashboard}
            label="Dashboard"
            to="/admin/dashboard"
            isCollapsed={isCollapsed}
          />

          {/* Procurement */}
          <SidebarMenuItem
            icon={ShoppingCart}
            label="Procurement"
            to="/admin/procurement"
            isCollapsed={isCollapsed}
          />

          {/* Drying Process */}
          <SidebarMenuItem
            icon={Sun}
            label="Drying"
            to="/admin/drying"
            isCollapsed={isCollapsed}
          />

          {/* Processing */}
          <SidebarMenuItem
            icon={Settings2}
            label="Processing"
            to="/admin/processing"
            isCollapsed={isCollapsed}
          />

          {/* Products with Submenu */}
          <SidebarMenuItem
            icon={Package}
            label="Products"
            to="/admin/products"
            basePath="/admin/products"
            hasSubmenu
            isOpen={openMenus.products}
            onClick={() => toggleMenu('products')}
            isCollapsed={isCollapsed}
          >
            <SidebarSubMenuItem
              icon={Tag}
              label="Varieties"
              to="/admin/products/categories"
            />
            <SidebarSubMenuItem
              icon={Warehouse}
              label="Inventory"
              to="/admin/products/inventory"
            />
          </SidebarMenuItem>

          {/* Point of Sale */}
          <SidebarMenuItem
            icon={Monitor}
            label="Point of Sale"
            to="/admin/pos"
            isCollapsed={isCollapsed}
          />

          {/* Partners with Submenu */}
          <SidebarMenuItem
            icon={Users}
            label="Partners"
            to="/admin/partners"
            basePath="/admin/partners"
            hasSubmenu
            isOpen={openMenus.partners}
            onClick={() => toggleMenu('partners')}
            isCollapsed={isCollapsed}
          >
            <SidebarSubMenuItem
              icon={Truck}
              label="Supplier"
              to="/admin/partners/supplier"
            />
            <SidebarSubMenuItem
              icon={UserCheck}
              label="Customer"
              to="/admin/partners/customer"
            />
          </SidebarMenuItem>

          {/* Staff Management */}
          <SidebarMenuItem
            icon={UserCog}
            label="Staff Management"
            to="/admin/staff-management"
            isCollapsed={isCollapsed}
          />

          {/* Sales */}
          <SidebarMenuItem
            icon={TrendingUp}
            label="Sales"
            to="/admin/sales"
            isCollapsed={isCollapsed}
          />

          {/* Audit Trail */}
          <SidebarMenuItem
            icon={ClipboardList}
            label="Audit Trail"
            to="/admin/audit-trail"
            isCollapsed={isCollapsed}
          />

          {/* Settings */}
          <SidebarMenuItem
            icon={Settings}
            label="Settings"
            to="/admin/settings"
            isCollapsed={isCollapsed}
          />
        </div>
      </nav>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-primary-100">
        <div className="relative group">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} p-2 rounded-xl bg-gradient-to-r from-secondary-100 to-secondary-50 dark:from-gray-700 dark:to-gray-600 cursor-pointer`}>
            <Avatar fallback="Admin User" size="md" />
            {!isCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 dark:text-gray-100 text-sm truncate">Admin U...</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">admin@exa...</p>
                </div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-button-500 hover:bg-button-600 text-white text-xs font-medium rounded-lg transition-colors">
                  <LogOut size={14} />
                  Logout
                </button>
              </>
            )}
          </div>
          {/* Tooltip when collapsed */}
          {isCollapsed && (
            <div className="absolute left-full bottom-0 ml-3 hidden group-hover:block z-50">
              <div className="bg-white dark:bg-gray-800 border-2 border-primary-300 dark:border-gray-700 rounded-xl shadow-xl p-3 min-w-[180px]">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-primary-100 dark:border-gray-700">
                  <Avatar fallback="Admin User" size="md" />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">Admin User</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">admin@example.com</p>
                  </div>
                </div>
                <button className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-button-500 hover:bg-button-600 text-white text-sm font-medium rounded-lg transition-colors">
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
              {/* Arrow */}
              <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-white dark:bg-gray-800 border-l-2 border-b-2 border-primary-300 dark:border-gray-700 rotate-45"></div>
            </div>
          )}
        </div>
      </div>
    </aside>
    </>
  );
};

export default Sidebar;
