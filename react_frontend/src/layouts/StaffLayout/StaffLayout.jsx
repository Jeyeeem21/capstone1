import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Monitor, 
  User,
  LogOut,
  X,
  Menu
} from 'lucide-react';
import { Footer } from '../../components/common';
import { Avatar } from '../../components/ui';
import { ConfirmModal } from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';

const StaffSidebar = ({ isCollapsed, onToggleCollapse, isMobileOpen, onMobileClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleLogout = async () => {
    setIsLogoutModalOpen(false);
    await logout();
    navigate('/?login=true');
  };

  const staffName = user?.first_name && user?.last_name 
    ? `${user.first_name} ${user.last_name}` 
    : user?.name || 'Staff User';

  // Close mobile sidebar when route changes
  useEffect(() => {
    if (onMobileClose) {
      onMobileClose();
    }
  }, [location.pathname]);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', to: '/staff/dashboard' },
    { icon: Monitor, label: 'Point of Sale', to: '/staff/pos' },
    { icon: User, label: 'My Profile', to: '/staff/profile' },
  ];

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
          fixed left-0 top-0 h-screen border-r-2 border-primary-300 dark:border-primary-700 
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
        <div className="p-4 border-b-2 border-primary-200 dark:border-primary-700">
          <div className={`flex items-center ${isCollapsed ? 'lg:justify-center' : 'justify-between'}`}>
            <div className={`flex items-center gap-3 ${isCollapsed ? 'lg:hidden' : ''}`}>
              <div className="w-10 h-10 bg-gradient-to-br from-button-500 to-button-600 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
                <img src="/logo.svg" alt="KJP Logo" className="w-8 h-8 object-contain" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                <span className="text-white font-bold text-lg hidden">K</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">KJP Ricemill</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Staff Portal</p>
              </div>
            </div>
            
            {/* Close button for mobile */}
            <button 
              onClick={onMobileClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 dark:bg-gray-700 lg:hidden"
            >
              <X size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                title={isCollapsed ? item.label : ''}
                className={({ isActive }) => `
                  flex items-center ${isCollapsed ? 'lg:justify-center' : 'gap-3'} px-4 py-3 rounded-lg transition-all duration-200 mb-0.5 group
                  ${isActive
                    ? 'bg-gradient-to-r from-button-500 to-button-400 text-white shadow-lg shadow-button-500/25'
                    : 'hover:bg-button-50 dark:hover:bg-button-500/40 hover:text-button-700 dark:text-button-300 dark:hover:text-button-300'
                  }
                `}
                style={({ isActive }) => !isActive ? { color: 'var(--color-text-sidebar)' } : undefined}
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={22} className={isActive ? 'text-white' : 'group-hover:text-button-600 dark:hover:text-button-400 dark:text-button-400'} style={!isActive ? { color: 'var(--color-text-sidebar)' } : undefined} />
                    {!isCollapsed && <span className="font-medium" style={{ fontSize: 'var(--font-size-sidebar)' }}>{item.label}</span>}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* User Profile Section */}
        <div className="p-3 border-t-2 border-primary-200 dark:border-primary-700">
          <div className={`flex items-center ${isCollapsed ? 'lg:justify-center' : 'gap-3'} p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl`}>
            <Avatar name={staffName} size="md" />
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">
                  {staffName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Staff</p>
              </div>
            )}
          </div>
          
          <button 
            onClick={() => setIsLogoutModalOpen(true)}
            className={`w-full mt-2 flex items-center ${isCollapsed ? 'lg:justify-center' : 'justify-center gap-2'} px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors`}
            title={isCollapsed ? 'Logout' : ''}
          >
            <LogOut size={18} />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>

        {/* Logout Confirmation Modal */}
        <ConfirmModal
          isOpen={isLogoutModalOpen}
          onClose={() => setIsLogoutModalOpen(false)}
          onConfirm={handleLogout}
          title="Confirm Logout"
          message="Are you sure you want to logout? You will need to login again to access the system."
          confirmText="Logout"
          cancelText="Cancel"
          variant="danger"
          icon={LogOut}
        />
      </aside>
    </>
  );
};

// Staff Header for mobile
const StaffHeader = ({ onMenuClick }) => {
  return (
    <header className="lg:hidden sticky top-0 z-50 bg-white dark:bg-gray-700 border-b-2 border-primary-300 dark:border-primary-700 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-button-500 to-button-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">K</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-800 dark:text-gray-100">KJP Ricemill</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Staff Portal</p>
          </div>
        </div>
        
        <button 
          onClick={onMenuClick}
          className="hidden md:block p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 dark:bg-gray-700"
        >
          <Menu size={24} className="text-gray-600 dark:text-gray-300" />
        </button>
      </div>
    </header>
  );
};

// Staff Bottom Navigation
const StaffBottomNav = () => {
  const location = useLocation();
  
  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', to: '/staff/dashboard' },
    { icon: Monitor, label: 'POS', to: '/staff/pos' },
    { icon: User, label: 'Profile', to: '/staff/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-700 border-t-2 border-primary-300 dark:border-primary-700 shadow-lg z-40 md:hidden">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center flex-1 h-full px-2 transition-colors ${
                isActive ? 'text-button-600 dark:text-button-400' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <item.icon size={22} className={isActive ? 'text-button-500' : ''} />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute bottom-0 w-12 h-1 bg-button-500 rounded-t-full" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

const StaffLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div 
      className="min-h-screen transition-colors duration-300 flex flex-col"
      style={{ backgroundColor: 'var(--color-bg-body)' }}
    >
      {/* Mobile/Tablet Header */}
      <StaffHeader onMenuClick={() => setIsMobileSidebarOpen(true)} />

      {/* Sidebar */}
      <StaffSidebar 
        isCollapsed={isSidebarCollapsed} 
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content */}
      <main className={`
        transition-all duration-300 flex-1 flex flex-col
        ml-0 pb-20
        md:pb-0
        lg:pb-0
        ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'}
      `}>
        <div className="p-4 md:p-6 lg:p-8 flex-1">
          <div 
            className="rounded-2xl shadow-xl border-2 border-primary-300 dark:border-primary-700 p-4 md:p-6 lg:p-8 min-h-[calc(100vh-10rem)] md:min-h-[calc(100vh-12rem)] lg:min-h-[calc(100vh-16rem)] transition-colors duration-300"
            style={{ 
              backgroundColor: 'var(--color-bg-content)', 
              color: 'var(--color-text-content)',
              fontSize: 'var(--font-size-base)'
            }}
          >
            <Outlet />
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-4 pb-4 md:px-6 md:pb-6 lg:px-8 lg:pb-8">
          <Footer />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <StaffBottomNav />
    </div>
  );
};

export default StaffLayout;
