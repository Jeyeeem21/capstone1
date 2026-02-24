import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Package, Star, ClipboardList, TrendingUp, ShoppingCart,
  ArrowRight, Clock, CheckCircle, Truck, XCircle,
  ChevronRight, Eye
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useTheme } from '../../../context/ThemeContext';
import { Skeleton } from '../../../components/ui';

// Mock data
const mockRecentOrders = [
  { id: 'ORD-20260220-001', date: '2026-02-20', status: 'Delivered', total: 2550, items: 3 },
  { id: 'ORD-20260218-002', date: '2026-02-18', status: 'Processing', total: 1700, items: 2 },
  { id: 'ORD-20260215-003', date: '2026-02-15', status: 'Shipped', total: 850, items: 1 },
  { id: 'ORD-20260210-004', date: '2026-02-10', status: 'Delivered', total: 2850, items: 4 },
  { id: 'ORD-20260205-005', date: '2026-02-05', status: 'Cancelled', total: 2500, items: 2 },
];

// Generate daily spending for current month (all days 1..N)
const generateDailySpending = () => {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const data = [];
  for (let d = 1; d <= daysInMonth; d++) {
    // Mock: random amount for past days, 0 for future
    const isPast = d <= now.getDate();
    data.push({ label: String(d), amount: isPast ? Math.floor(Math.random() * 2500) + 200 : 0 });
  }
  return data;
};

// Generate monthly spending for current year (Jan..Dec)
const generateMonthlySpending = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  return months.map((m, i) => ({
    label: m,
    amount: i <= now.getMonth() ? Math.floor(Math.random() * 8000) + 1000 : 0,
  }));
};

// Generate yearly spending for past 4 years + current
const generateYearlySpending = () => {
  const now = new Date();
  const data = [];
  for (let y = now.getFullYear() - 4; y <= now.getFullYear(); y++) {
    data.push({ label: String(y), amount: Math.floor(Math.random() * 50000) + 10000 });
  }
  return data;
};

const spendingLabels = {
  daily: 'Daily Spending',
  monthly: 'Monthly Spending',
  yearly: 'Yearly Spending',
};

const spendingDesc = {
  daily: 'Purchase activity for this month',
  monthly: 'All months of the current year',
  yearly: 'Annual spending overview',
};

const mockOrderStatusData = [
  { name: 'Delivered', value: 8, color: '#22c55e' },
  { name: 'Processing', value: 2, color: '#3b82f6' },
  { name: 'Shipped', value: 1, color: '#8b5cf6' },
  { name: 'Cancelled', value: 1, color: '#ef4444' },
];

const statusConfig = {
  'Pending': { icon: Clock, color: '#eab308', bg: '#fefce8' },
  'Processing': { icon: Package, color: '#3b82f6', bg: '#eff6ff' },
  'Shipped': { icon: Truck, color: '#8b5cf6', bg: '#f5f3ff' },
  'Delivered': { icon: CheckCircle, color: '#22c55e', bg: '#f0fdf4' },
  'Cancelled': { icon: XCircle, color: '#ef4444', bg: '#fef2f2' },
};

const ClientDashboard = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [spendingPeriod, setSpendingPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const summaryCards = [
    { label: 'Total Orders', value: '12', icon: ClipboardList, description: 'All time orders' },
    { label: 'Active Orders', value: '2', icon: Truck, description: 'In progress' },
    { label: 'Total Spent', value: '₱15,300', icon: TrendingUp, description: 'Lifetime value' },
  ];

  const currentSpendingData = useMemo(() => {
    if (spendingPeriod === 'daily') return generateDailySpending();
    if (spendingPeriod === 'monthly') return generateMonthlySpending();
    return generateYearlySpending();
  }, [spendingPeriod]);

  // Custom tooltip for bar chart - matching procurement style with % change
  const SpendingTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const currentValue = payload[0].value || 0;
    const currentIndex = currentSpendingData.findIndex(d => String(d.label) === String(label));
    const prevValue = currentIndex > 0 ? (currentSpendingData[currentIndex - 1]?.amount || 0) : null;

    let changePercent = null;
    let changeDirection = null;
    if (prevValue !== null && prevValue !== 0) {
      changePercent = ((currentValue - prevValue) / prevValue * 100).toFixed(1);
      changeDirection = changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'same';
    } else if (prevValue === 0 && currentValue > 0) {
      changePercent = '100.0';
      changeDirection = 'up';
    } else if (prevValue !== null && prevValue === 0 && currentValue === 0) {
      changePercent = '0.0';
      changeDirection = 'same';
    }

    return (
      <div className="bg-white rounded-xl shadow-lg p-3 min-w-[180px]" style={{ border: `1px solid ${theme.border_color}` }}>
        <p className="text-sm font-semibold mb-2 pb-1.5" style={{ color: theme.text_primary, borderBottom: `1px solid ${theme.border_color}20` }}>{label}</p>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.button_primary }} />
              <span className="text-xs" style={{ color: theme.text_secondary }}>Spending</span>
            </div>
            <span className="text-sm font-bold" style={{ color: theme.text_primary }}>₱{currentValue.toLocaleString()}</span>
          </div>
          {changePercent !== null && (
            <div className="flex items-center justify-end gap-1">
              {changeDirection === 'up' && (
                <span className="text-[11px] font-medium text-green-600 flex items-center gap-0.5">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2L8 6H2L5 2Z" fill="currentColor"/></svg>
                  +{changePercent}%
                </span>
              )}
              {changeDirection === 'down' && (
                <span className="text-[11px] font-medium text-red-600 flex items-center gap-0.5">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 8L2 4H8L5 8Z" fill="currentColor"/></svg>
                  {changePercent}%
                </span>
              )}
              {changeDirection === 'same' && (
                <span className="text-[11px] font-medium text-gray-400">0.0%</span>
              )}
              <span className="text-[10px]" style={{ color: theme.text_secondary }}>vs prev</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Banner */}
      <div 
        className="rounded-2xl p-6 sm:p-8 mb-8 text-white relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${theme.button_primary}, ${theme.button_primary}cc)` }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4" />
        <div className="relative">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Welcome back, Maria!</h1>
          <p className="text-white/80 text-sm sm:text-base max-w-lg">
            Browse our premium rice products and place your order. We deliver quality rice right to your doorstep.
          </p>
          <div className="flex gap-3 mt-4">
            <Link
              to="/client/shop"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors backdrop-blur-sm"
            >
              <ShoppingCart size={16} /> Shop Now <ArrowRight size={16} />
            </Link>
            <Link
              to="/client/orders"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition-colors backdrop-blur-sm"
            >
              <ClipboardList size={16} /> My Orders
            </Link>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 sm:p-5" style={{ border: `1px solid ${theme.border_color}` }}>
              <Skeleton variant="circle" width="w-10" height="h-10" className="mb-3" />
              <Skeleton variant="title" width="w-20" className="mb-1" />
              <Skeleton variant="text" width="w-24" />
            </div>
          ))}
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {summaryCards.map((card) => (
          <div 
            key={card.label} 
            className="bg-white rounded-xl p-4 sm:p-5 transition-all hover:shadow-md"
            style={{ border: `1px solid ${theme.border_color}` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${theme.button_primary}15` }}
              >
                <card.icon size={20} style={{ color: theme.button_primary }} />
              </div>
            </div>
            <p className="text-2xl font-bold" style={{ color: theme.text_primary }}>{card.value}</p>
            <p className="text-sm font-medium" style={{ color: theme.text_secondary }}>{card.label}</p>
          </div>
        ))}
      </div>
      )}

      {/* Charts Section */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-xl p-5" style={{ border: `1px solid ${theme.border_color}` }}>
            <Skeleton variant="title" width="w-32" className="mb-2" />
            <Skeleton variant="text" width="w-48" className="mb-4" />
            <Skeleton variant="custom" className="h-[250px] w-full rounded-lg" />
          </div>
          <div className="bg-white rounded-xl p-5" style={{ border: `1px solid ${theme.border_color}` }}>
            <Skeleton variant="title" width="w-24" className="mb-2" />
            <Skeleton variant="text" width="w-36" className="mb-4" />
            <div className="flex items-center justify-center py-4">
              <Skeleton variant="circle" width="w-[160px]" height="h-[160px]" />
            </div>
            <div className="space-y-2 mt-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} variant="text" width="w-full" />)}
            </div>
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Spending Bar Chart with period toggle */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5" style={{ border: `1px solid ${theme.border_color}` }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold" style={{ color: theme.text_primary }}>{spendingLabels[spendingPeriod]}</h2>
              <p className="text-xs" style={{ color: theme.text_secondary }}>{spendingDesc[spendingPeriod]}</p>
            </div>
            {/* Period Toggle - admin style */}
            <div className="flex rounded-lg p-1 shadow-sm" style={{ backgroundColor: '#f9fafb', border: `1px solid ${theme.border_color}` }}>
              {['daily', 'monthly', 'yearly'].map(period => (
                <button key={period} onClick={() => setSpendingPeriod(period)}
                  className="px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize"
                  style={spendingPeriod === period
                    ? { backgroundColor: theme.button_primary, color: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }
                    : { color: theme.text_secondary }
                  }>
                  {period}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={currentSpendingData} barSize={spendingPeriod === 'daily' ? 12 : spendingPeriod === 'yearly' ? 48 : 32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: theme.text_secondary }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: theme.text_secondary }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `₱${(v/1000).toFixed(0)}k` : `₱${v}`} />
              <Tooltip content={<SpendingTooltip />} />
              <Bar dataKey="amount" fill={theme.button_primary} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Order Status Donut Chart */}
        <div className="bg-white rounded-xl p-5" style={{ border: `1px solid ${theme.border_color}` }}>
          <div className="mb-4">
            <h2 className="text-lg font-bold" style={{ color: theme.text_primary }}>Order Status</h2>
            <p className="text-xs" style={{ color: theme.text_secondary }}>Breakdown of your orders</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="relative">
              <ResponsiveContainer width={200} height={180}>
                <PieChart>
                  <Pie data={mockOrderStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" stroke="none" paddingAngle={2}>
                    {mockOrderStatusData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value} orders`, name]} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: theme.text_primary }}>
                    {mockOrderStatusData.reduce((s, d) => s + d.value, 0)}
                  </p>
                  <p className="text-[10px]" style={{ color: theme.text_secondary }}>Total</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2 w-full">
              {mockOrderStatusData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-xs" style={{ color: theme.text_secondary }}>{d.name}</span>
                  <span className="text-xs font-semibold ml-auto" style={{ color: theme.text_primary }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Recent Orders - Compact Table */}
      {loading ? (
        <div className="bg-white rounded-xl p-5" style={{ border: `1px solid ${theme.border_color}` }}>
          <div className="flex items-center justify-between mb-4">
            <Skeleton variant="title" width="w-32" />
            <Skeleton variant="text" width="w-16" />
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton variant="text" width="w-32" />
                <Skeleton variant="text" width="w-20" />
                <Skeleton variant="text" width="w-12" />
                <Skeleton variant="text" width="w-20" className="ml-auto" />
                <Skeleton variant="button" width="w-16" />
              </div>
            ))}
          </div>
        </div>
      ) : (
      <div className="bg-white rounded-xl" style={{ border: `1px solid ${theme.border_color}` }}>
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${theme.border_color}` }}>
          <h2 className="text-base font-semibold" style={{ color: theme.text_primary }}>Recent Orders</h2>
          <Link 
            to="/client/orders" 
            className="text-xs font-medium flex items-center gap-1 hover:underline"
            style={{ color: theme.button_primary }}
          >
            View All <ChevronRight size={12} />
          </Link>
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.border_color}` }}>
                <th className="text-left text-xs font-medium px-5 py-2.5" style={{ color: theme.text_secondary }}>Order ID</th>
                <th className="text-left text-xs font-medium px-3 py-2.5" style={{ color: theme.text_secondary }}>Date</th>
                <th className="text-center text-xs font-medium px-3 py-2.5" style={{ color: theme.text_secondary }}>Items</th>
                <th className="text-right text-xs font-medium px-3 py-2.5" style={{ color: theme.text_secondary }}>Total</th>
                <th className="text-center text-xs font-medium px-3 py-2.5" style={{ color: theme.text_secondary }}>Status</th>
                <th className="text-center text-xs font-medium px-5 py-2.5" style={{ color: theme.text_secondary }}></th>
              </tr>
            </thead>
            <tbody>
              {mockRecentOrders.map((order, idx) => {
                const config = statusConfig[order.status] || statusConfig['Pending'];
                return (
                  <tr key={order.id}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    style={{ borderBottom: idx < mockRecentOrders.length - 1 ? `1px solid ${theme.border_color}` : 'none' }}
                    onClick={() => navigate('/client/orders')}>
                    <td className="px-5 py-2.5">
                      <span className="text-sm font-semibold" style={{ color: theme.text_primary }}>{order.id}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs" style={{ color: theme.text_secondary }}>
                        {new Date(order.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-xs" style={{ color: theme.text_secondary }}>{order.items}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span className="text-sm font-semibold" style={{ color: theme.text_primary }}>₱{order.total.toLocaleString()}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-[11px] font-medium px-2.5 py-1 rounded-full inline-block"
                        style={{ backgroundColor: config.bg, color: config.color }}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-center">
                      <Eye size={14} style={{ color: theme.text_secondary }} className="inline-block" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="sm:hidden divide-y" style={{ borderColor: theme.border_color }}>
          {mockRecentOrders.map((order) => {
            const config = statusConfig[order.status] || statusConfig['Pending'];
            const StatusIcon = config.icon;
            return (
              <div key={order.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 cursor-pointer"
                onClick={() => navigate('/client/orders')}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: config.bg }}>
                  <StatusIcon size={14} style={{ color: config.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: theme.text_primary }}>{order.id}</p>
                  <p className="text-[10px]" style={{ color: theme.text_secondary }}>
                    {new Date(order.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {order.items} item(s)
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-semibold" style={{ color: theme.text_primary }}>₱{order.total.toLocaleString()}</p>
                  <span className="text-[10px] font-medium" style={{ color: config.color }}>{order.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
};

export default ClientDashboard;
