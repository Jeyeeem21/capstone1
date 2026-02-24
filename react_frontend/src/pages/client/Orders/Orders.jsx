import { useState, useMemo, useEffect } from 'react';
import { 
  Clock, CheckCircle, Truck, XCircle, Package, 
  Search, Eye, ChevronDown, ChevronUp, RotateCcw,
  Calendar, MapPin, CreditCard, FileText, ClipboardList
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { Skeleton } from '../../../components/ui';

// Mock orders data
const mockOrders = [
  {
    id: 'ORD-20260220-001',
    date: '2026-02-20',
    status: 'Delivered',
    paymentMethod: 'Cash on Delivery',
    paymentStatus: 'Paid',
    deliveryAddress: '123 Main St, Calapan City, Oriental Mindoro',
    items: [
      { id: 1, name: 'Premium Jasmine Rice', quantity: 2, price: 850, unit: '25kg' },
      { id: 5, name: 'IR64 Rice', quantity: 1, price: 520, unit: '25kg' },
    ],
    subtotal: 2220,
    discount: 0,
    deliveryFee: 100,
    total: 2320,
    deliveredAt: '2026-02-22',
    notes: '',
  },
  {
    id: 'ORD-20260218-002',
    date: '2026-02-18',
    status: 'Processing',
    paymentMethod: 'GCash',
    paymentStatus: 'Paid',
    deliveryAddress: '123 Main St, Calapan City, Oriental Mindoro',
    items: [
      { id: 6, name: 'Sinandomeng Rice', quantity: 1, price: 780, unit: '25kg' },
      { id: 3, name: 'Brown Rice', quantity: 1, price: 750, unit: '25kg' },
    ],
    subtotal: 1530,
    discount: 50,
    deliveryFee: 100,
    total: 1580,
    deliveredAt: null,
    notes: 'Please deliver before noon.',
  },
  {
    id: 'ORD-20260215-003',
    date: '2026-02-15',
    status: 'Shipped',
    paymentMethod: 'Bank Transfer',
    paymentStatus: 'Paid',
    deliveryAddress: '456 Rizal Ave, Calapan City, Oriental Mindoro',
    items: [
      { id: 1, name: 'Premium Jasmine Rice', quantity: 1, price: 850, unit: '25kg' },
    ],
    subtotal: 850,
    discount: 0,
    deliveryFee: 0,
    total: 850,
    deliveredAt: null,
    notes: '',
  },
  {
    id: 'ORD-20260210-004',
    date: '2026-02-10',
    status: 'Delivered',
    paymentMethod: 'Cash on Delivery',
    paymentStatus: 'Paid',
    deliveryAddress: '123 Main St, Calapan City, Oriental Mindoro',
    items: [
      { id: 2, name: 'Long Grain White Rice', quantity: 3, price: 650, unit: '25kg' },
      { id: 4, name: 'Glutinous Rice', quantity: 1, price: 900, unit: '25kg' },
    ],
    subtotal: 2850,
    discount: 100,
    deliveryFee: 100,
    total: 2850,
    deliveredAt: '2026-02-13',
    notes: '',
  },
  {
    id: 'ORD-20260205-005',
    date: '2026-02-05',
    status: 'Cancelled',
    paymentMethod: 'GCash',
    paymentStatus: 'Refunded',
    deliveryAddress: '123 Main St, Calapan City, Oriental Mindoro',
    items: [
      { id: 7, name: 'Dinorado Rice', quantity: 2, price: 1200, unit: '25kg' },
    ],
    subtotal: 2400,
    discount: 0,
    deliveryFee: 100,
    total: 2500,
    deliveredAt: null,
    notes: 'Product was out of stock.',
  },
  {
    id: 'ORD-20260130-006',
    date: '2026-01-30',
    status: 'Delivered',
    paymentMethod: 'Cash on Delivery',
    paymentStatus: 'Paid',
    deliveryAddress: '123 Main St, Calapan City, Oriental Mindoro',
    items: [
      { id: 1, name: 'Premium Jasmine Rice', quantity: 4, price: 850, unit: '25kg' },
    ],
    subtotal: 3400,
    discount: 200,
    deliveryFee: 0,
    total: 3200,
    deliveredAt: '2026-02-02',
    notes: '',
  },
];

const statusConfig = {
  'Pending': { icon: Clock, color: '#eab308', bg: '#fefce8', label: 'Pending' },
  'Processing': { icon: Package, color: '#3b82f6', bg: '#eff6ff', label: 'Processing' },
  'Shipped': { icon: Truck, color: '#8b5cf6', bg: '#f5f3ff', label: 'Shipped' },
  'Delivered': { icon: CheckCircle, color: '#22c55e', bg: '#f0fdf4', label: 'Delivered' },
  'Cancelled': { icon: XCircle, color: '#ef4444', bg: '#fef2f2', label: 'Cancelled' },
};

const statusTabs = ['All', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

const Orders = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const filteredOrders = useMemo(() => {
    return mockOrders.filter(order => {
      const matchesTab = activeTab === 'All' || order.status === activeTab;
      const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            order.items.some(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesTab && matchesSearch;
    });
  }, [activeTab, searchTerm]);

  const orderStats = useMemo(() => {
    return {
      total: mockOrders.length,
      active: mockOrders.filter(o => ['Processing', 'Shipped'].includes(o.status)).length,
      delivered: mockOrders.filter(o => o.status === 'Delivered').length,
      cancelled: mockOrders.filter(o => o.status === 'Cancelled').length,
    };
  }, []);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: theme.text_primary }}>My Orders</h1>
        <p className="text-sm mt-1" style={{ color: theme.text_secondary }}>
          Track and manage your orders
        </p>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4" style={{ border: `1px solid ${theme.border_color}` }}>
              <Skeleton variant="title" width="w-12" className="mb-1" />
              <Skeleton variant="text" width="w-20" />
            </div>
          ))}
        </div>
      ) : (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Orders', value: orderStats.total, color: theme.button_primary },
          { label: 'Active', value: orderStats.active, color: '#3b82f6' },
          { label: 'Delivered', value: orderStats.delivered, color: '#22c55e' },
          { label: 'Cancelled', value: orderStats.cancelled, color: '#ef4444' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl p-4" style={{ border: `1px solid ${theme.border_color}` }}>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-xs" style={{ color: theme.text_secondary }}>{stat.label}</p>
          </div>
        ))}
      </div>
      )}

      {/* Filters */}
      {loading ? (
        <div className="bg-white rounded-xl p-4 mb-6" style={{ border: `1px solid ${theme.border_color}` }}>
          <div className="flex flex-col sm:flex-row gap-3">
            <Skeleton variant="input" className="flex-1" />
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => <Skeleton key={i} variant="button" width="w-20" />)}
            </div>
          </div>
        </div>
      ) : (
      <div className="bg-white rounded-xl p-4 mb-6" style={{ border: `1px solid ${theme.border_color}` }}>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.text_secondary }} />
            <input
              type="text"
              placeholder="Search by order ID or product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border-2 rounded-xl focus:outline-none transition-all"
              style={{ borderColor: theme.border_color, color: theme.text_primary }}
              onFocus={(e) => e.target.style.borderColor = theme.button_primary}
              onBlur={(e) => e.target.style.borderColor = theme.border_color}
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {statusTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
                style={activeTab === tab ? {
                  backgroundColor: theme.button_primary,
                  color: '#fff',
                } : {
                  backgroundColor: '#f3f4f6',
                  color: theme.text_secondary,
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Orders List - 2 per row */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-5" style={{ border: `1px solid ${theme.border_color}` }}>
              <div className="flex items-center justify-between mb-3">
                <Skeleton variant="text" width="w-36" />
                <Skeleton variant="button" width="w-20" />
              </div>
              <div className="space-y-2 mb-3">
                <Skeleton variant="text" width="w-full" />
                <Skeleton variant="text" width="w-3/4" />
              </div>
              <div className="flex justify-between">
                <Skeleton variant="text" width="w-20" />
                <Skeleton variant="title" width="w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl" style={{ border: `1px solid ${theme.border_color}` }}>
          <ClipboardList size={48} className="mx-auto mb-4" style={{ color: theme.text_secondary }} />
          <h3 className="text-lg font-semibold" style={{ color: theme.text_primary }}>No orders found</h3>
          <p className="text-sm mt-1" style={{ color: theme.text_secondary }}>
            {activeTab !== 'All' ? `No ${activeTab.toLowerCase()} orders` : 'Try a different search term'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          {filteredOrders.map(order => {
            const config = statusConfig[order.status];
            const StatusIcon = config.icon;
            const isExpanded = expandedOrder === order.id;

            return (
              <div 
                key={order.id} 
                className="bg-white rounded-xl overflow-hidden transition-all"
                style={{ border: `1px solid ${theme.border_color}` }}
              >
                {/* Order Header - compact */}
                <button
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: config.bg }}
                    >
                      <StatusIcon size={14} style={{ color: config.color }} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-semibold" style={{ color: theme.text_primary }}>{order.id}</p>
                      <p className="text-[10px]" style={{ color: theme.text_secondary }}>
                        {new Date(order.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' · '}{order.items.length} item(s)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-xs font-bold" style={{ color: theme.text_primary }}>₱{order.total.toLocaleString()}</p>
                      <span 
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: config.bg, color: config.color }}
                      >
                        {order.status}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={14} style={{ color: theme.text_secondary }} />
                    ) : (
                      <ChevronDown size={14} style={{ color: theme.text_secondary }} />
                    )}
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t px-3 pb-3" style={{ borderColor: theme.border_color }}>
                    {/* Status Timeline - compact */}
                    <div className="flex items-center gap-1.5 py-3 overflow-x-auto">
                      {['Pending', 'Processing', 'Shipped', 'Delivered'].map((step, idx) => {
                        const stepConfig = statusConfig[step];
                        const isActive = ['Pending', 'Processing', 'Shipped', 'Delivered'].indexOf(order.status) >= idx;
                        const isCancelled = order.status === 'Cancelled';
                        return (
                          <div key={step} className="flex items-center gap-1.5">
                            <div className="flex flex-col items-center">
                              <div 
                                className="w-6 h-6 rounded-full flex items-center justify-center"
                                style={{ 
                                  backgroundColor: isCancelled ? '#fef2f2' : isActive ? stepConfig.bg : '#f3f4f6',
                                }}
                              >
                                <stepConfig.icon size={10} style={{ color: isCancelled ? '#ef4444' : isActive ? stepConfig.color : '#d1d5db' }} />
                              </div>
                              <span className="text-[9px] mt-0.5 whitespace-nowrap" style={{ color: isActive && !isCancelled ? stepConfig.color : theme.text_secondary }}>
                                {step}
                              </span>
                            </div>
                            {idx < 3 && (
                              <div 
                                className="w-5 sm:w-8 h-0.5 rounded mb-3"
                                style={{ backgroundColor: isCancelled ? '#fecaca' : isActive ? stepConfig.color : '#e5e7eb' }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Order Info Grid - compact */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="flex items-start gap-1.5 p-2 bg-gray-50 rounded-lg">
                        <CreditCard size={12} className="mt-0.5 flex-shrink-0" style={{ color: theme.text_secondary }} />
                        <div className="min-w-0">
                          <p className="text-[9px] font-medium" style={{ color: theme.text_secondary }}>Payment</p>
                          <p className="text-[11px] font-semibold truncate" style={{ color: theme.text_primary }}>{order.paymentMethod}</p>
                          <p className="text-[9px]" style={{ color: order.paymentStatus === 'Paid' ? '#22c55e' : order.paymentStatus === 'Refunded' ? '#ef4444' : '#eab308' }}>
                            {order.paymentStatus}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-1.5 p-2 bg-gray-50 rounded-lg">
                        <MapPin size={12} className="mt-0.5 flex-shrink-0" style={{ color: theme.text_secondary }} />
                        <div className="min-w-0">
                          <p className="text-[9px] font-medium" style={{ color: theme.text_secondary }}>Address</p>
                          <p className="text-[10px] truncate" style={{ color: theme.text_primary }} title={order.deliveryAddress}>{order.deliveryAddress}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-1.5 p-2 bg-gray-50 rounded-lg">
                        <Calendar size={12} className="mt-0.5 flex-shrink-0" style={{ color: theme.text_secondary }} />
                        <div className="min-w-0">
                          <p className="text-[9px] font-medium" style={{ color: theme.text_secondary }}>
                            {order.deliveredAt ? 'Delivered' : 'Placed'}
                          </p>
                          <p className="text-[11px] font-semibold" style={{ color: theme.text_primary }}>
                            {new Date(order.deliveredAt || order.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Items - compact */}
                    <div className="border rounded-lg overflow-hidden" style={{ borderColor: theme.border_color }}>
                      <div className="bg-gray-50 px-3 py-1.5">
                        <p className="text-[9px] font-semibold" style={{ color: theme.text_secondary }}>ORDER ITEMS</p>
                      </div>
                      <div className="divide-y" style={{ borderColor: theme.border_color }}>
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between px-3 py-2">
                            <div>
                              <p className="text-xs font-medium" style={{ color: theme.text_primary }}>{item.name}</p>
                              <p className="text-[10px]" style={{ color: theme.text_secondary }}>
                                {item.quantity} × ₱{item.price.toLocaleString()} / {item.unit}
                              </p>
                            </div>
                            <p className="text-xs font-semibold" style={{ color: theme.text_primary }}>
                              ₱{(item.quantity * item.price).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                      {/* Totals */}
                      <div className="border-t px-3 py-2 space-y-0.5" style={{ borderColor: theme.border_color }}>
                        <div className="flex justify-between text-[10px]" style={{ color: theme.text_secondary }}>
                          <span>Subtotal</span>
                          <span>₱{order.subtotal.toLocaleString()}</span>
                        </div>
                        {order.discount > 0 && (
                          <div className="flex justify-between text-[10px] text-green-600">
                            <span>Discount</span>
                            <span>-₱{order.discount.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-[10px]" style={{ color: theme.text_secondary }}>
                          <span>Delivery Fee</span>
                          <span>{order.deliveryFee > 0 ? `₱${order.deliveryFee.toLocaleString()}` : 'Free'}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold pt-1 border-t" style={{ borderColor: theme.border_color, color: theme.text_primary }}>
                          <span>Total</span>
                          <span style={{ color: theme.button_primary }}>₱{order.total.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Notes */}
                    {order.notes && (
                      <div className="mt-2 flex items-start gap-1.5 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <FileText size={12} className="text-yellow-600 mt-0.5" />
                        <p className="text-[10px] text-yellow-800">{order.notes}</p>
                      </div>
                    )}

                    {/* Actions */}
                    {order.status === 'Delivered' && (
                      <div className="mt-2">
                        <button
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:opacity-90"
                          style={{ backgroundColor: theme.button_primary }}
                        >
                          <RotateCcw size={12} /> Reorder
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Need ClipboardList for empty state
const ClipboardList2 = ClipboardList;

export default Orders;
