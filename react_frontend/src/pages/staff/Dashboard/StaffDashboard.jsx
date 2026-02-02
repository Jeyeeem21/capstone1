import { useState, useEffect } from 'react';
import { LayoutDashboard, Package, AlertTriangle, Clock, ShoppingCart, TrendingUp, Bell, CheckCircle } from 'lucide-react';
import { PageHeader } from '../../../components/common';
import { DataTable, StatusBadge, StatsCard, DonutChart } from '../../../components/ui';

// Helper to get CSS variable value
const getCSSVariable = (name) => {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
};

const StaffDashboard = () => {
  const [themeColors, setThemeColors] = useState({
    primary: '#22c55e',
    secondary: '#eab308',
    button: '#22c55e'
  });

  // Listen for theme changes
  useEffect(() => {
    const updateColors = () => {
      setThemeColors({
        primary: getCSSVariable('--color-primary-500') || '#22c55e',
        secondary: getCSSVariable('--color-button-secondary') || '#eab308',
        button: getCSSVariable('--color-button-500') || '#22c55e'
      });
    };
    
    updateColors();
    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    
    return () => observer.disconnect();
  }, []);

  // Mock low stock items
  const lowStockItems = [
    { id: 1, product: 'Premium Rice 25kg', sku: 'PR-25KG', currentStock: 15, minStock: 50, status: 'Critical' },
    { id: 2, product: 'Regular Rice 10kg', sku: 'RR-10KG', currentStock: 28, minStock: 40, status: 'Low' },
    { id: 3, product: 'Jasmine Rice 5kg', sku: 'JR-05KG', currentStock: 32, minStock: 45, status: 'Low' },
    { id: 4, product: 'Brown Rice 10kg', sku: 'BR-10KG', currentStock: 8, minStock: 30, status: 'Critical' },
    { id: 5, product: 'Glutinous Rice 2kg', sku: 'GR-02KG', currentStock: 45, minStock: 50, status: 'Low' },
  ];

  // Mock recent activities
  const recentActivities = [
    { id: 1, action: 'Sale Completed', description: 'INV-2026-001 - ₱12,500', time: '10 minutes ago', type: 'sale' },
    { id: 2, action: 'Stock Updated', description: 'Premium Rice 25kg +50 units', time: '25 minutes ago', type: 'stock' },
    { id: 3, action: 'New Order', description: 'Customer: Juan Dela Cruz', time: '1 hour ago', type: 'order' },
    { id: 4, action: 'Low Stock Alert', description: 'Brown Rice 10kg below minimum', time: '2 hours ago', type: 'alert' },
    { id: 5, action: 'Sale Completed', description: 'INV-2026-002 - ₱8,750', time: '3 hours ago', type: 'sale' },
  ];

  // Mock today's stats
  const todayStats = {
    totalSales: 12,
    totalRevenue: 45850,
    itemsSold: 156,
    lowStockCount: lowStockItems.filter(item => item.status === 'Critical').length,
  };

  // Stock status distribution
  const stockDistribution = [
    { name: 'Healthy Stock', value: 45, color: themeColors.button },
    { name: 'Low Stock', value: 8, color: '#f59e0b' },
    { name: 'Critical', value: 3, color: '#ef4444' },
  ];

  const lowStockColumns = [
    { 
      header: 'Product', 
      accessor: 'product',
      cell: (row) => (
        <div>
          <p className="font-medium text-gray-800">{row.product}</p>
          <p className="text-xs text-gray-500">{row.sku}</p>
        </div>
      )
    },
    { 
      header: 'Current Stock', 
      accessor: 'currentStock',
      cell: (row) => (
        <span className={`font-semibold ${row.status === 'Critical' ? 'text-red-600' : 'text-yellow-600'}`}>
          {row.currentStock} units
        </span>
      )
    },
    { 
      header: 'Min. Required', 
      accessor: 'minStock',
      cell: (row) => <span className="text-gray-600">{row.minStock} units</span>
    },
    { 
      header: 'Status', 
      accessor: 'status', 
      cell: (row) => (
        <StatusBadge 
          status={row.status} 
          customColors={{
            Critical: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
            Low: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
          }}
        />
      )
    },
  ];

  const getActivityIcon = (type) => {
    switch (type) {
      case 'sale': return <ShoppingCart size={16} className="text-green-500" />;
      case 'stock': return <Package size={16} className="text-blue-500" />;
      case 'order': return <CheckCircle size={16} className="text-purple-500" />;
      case 'alert': return <AlertTriangle size={16} className="text-red-500" />;
      default: return <Bell size={16} className="text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Staff Dashboard" 
        description="Quick overview of today's activities and alerts"
        icon={LayoutDashboard}
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          label="Today's Sales" 
          value={todayStats.totalSales} 
          unit="transactions" 
          icon={ShoppingCart}
          iconBgColor="bg-gradient-to-br from-button-400 to-button-600"
        />
        <StatsCard 
          label="Revenue Today" 
          value={`₱${todayStats.totalRevenue.toLocaleString()}`} 
          unit="" 
          icon={TrendingUp}
          iconBgColor="bg-gradient-to-br from-green-400 to-green-600"
        />
        <StatsCard 
          label="Items Sold" 
          value={todayStats.itemsSold} 
          unit="units" 
          icon={Package}
          iconBgColor="bg-gradient-to-br from-blue-400 to-blue-600"
        />
        <StatsCard 
          label="Critical Stock" 
          value={todayStats.lowStockCount} 
          unit="items" 
          icon={AlertTriangle}
          iconBgColor="bg-gradient-to-br from-red-400 to-red-600"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Alerts - Takes 2 columns */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border-2 border-primary-200 shadow-sm">
            <div className="px-5 py-4 border-b border-primary-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle size={20} className="text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Low Stock Alerts</h3>
                  <p className="text-sm text-gray-500">Items requiring immediate attention</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
                {lowStockItems.length} items
              </span>
            </div>
            <div className="p-4">
              <DataTable
                columns={lowStockColumns}
                data={lowStockItems}
                pageSize={5}
                searchable={false}
                selectable={false}
              />
            </div>
          </div>
        </div>

        {/* Stock Distribution Chart */}
        <div>
          <DonutChart
            title="Stock Status"
            subtitle="Inventory health overview"
            data={stockDistribution}
            centerValue={`${stockDistribution.reduce((sum, d) => sum + d.value, 0)}`}
            centerLabel="Total Products"
            height={200}
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border-2 border-primary-200 shadow-sm">
        <div className="px-5 py-4 border-b border-primary-100 flex items-center gap-3">
          <div className="p-2 bg-button-100 rounded-lg">
            <Clock size={20} className="text-button-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Recent Activity</h3>
            <p className="text-sm text-gray-500">Your latest actions and updates</p>
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {recentActivities.map((activity) => (
              <div 
                key={activity.id}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-gray-100 rounded-lg">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800">{activity.action}</p>
                  <p className="text-sm text-gray-500 truncate">{activity.description}</p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-br from-button-50 to-button-100 rounded-xl border-2 border-button-200 p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a 
            href="/staff/pos" 
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-button-200 hover:border-button-400 hover:shadow-md transition-all"
          >
            <div className="p-3 bg-button-500 rounded-xl">
              <ShoppingCart size={24} className="text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">Open POS</span>
          </a>
          <a 
            href="/staff/profile" 
            className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-button-200 hover:border-button-400 hover:shadow-md transition-all"
          >
            <div className="p-3 bg-blue-500 rounded-xl">
              <LayoutDashboard size={24} className="text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">My Profile</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
