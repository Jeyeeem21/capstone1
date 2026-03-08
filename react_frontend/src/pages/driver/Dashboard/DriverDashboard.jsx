import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck, Package, MapPin, Clock, CheckCircle, XCircle, AlertTriangle,
  ChevronRight, Calendar, TrendingUp, Navigation
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { Skeleton } from '../../../components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Driver data — will connect to real auth/API
const mockDriver = {
  id: 0,
  name: '—',
  total_deliveries: 0,
};

// Delivery stats — will connect to real API
const mockStats = {
  todayDeliveries: 0,
  pending: 0,
  inTransit: 0,
  delivered: 0,
  failed: 0,
};

// Today's deliveries — will connect to real API
const mockTodayDeliveries = [];

// Chart data generators — return empty until API connected
const generateDailyDeliveries = () => [];
const generateMonthlyDeliveries = () => [];
const generateYearlyDeliveries = () => [];

const deliveryLabels = {
  daily: 'Daily Deliveries',
  monthly: 'Monthly Deliveries',
  yearly: 'Yearly Deliveries',
};

const deliveryDesc = {
  daily: 'Delivery activity for this month',
  monthly: 'All months of the current year',
  yearly: 'Annual delivery overview',
};

// Status config
const statusConfig = {
  'Pending': { color: '#f59e0b', bg: '#fef3c7', icon: Clock },
  'In Transit': { color: '#3b82f6', bg: '#dbeafe', icon: Navigation },
  'Delivered': { color: '#22c55e', bg: '#dcfce7', icon: CheckCircle },
  'Failed': { color: '#ef4444', bg: '#fee2e2', icon: XCircle },
  'Cancelled': { color: '#6b7280', bg: '#f3f4f6', icon: XCircle },
};

const priorityColors = {
  'Low': { color: '#6b7280', bg: '#f3f4f6' },
  'Normal': { color: '#3b82f6', bg: '#dbeafe' },
  'High': { color: '#f59e0b', bg: '#fef3c7' },
  'Urgent': { color: '#ef4444', bg: '#fee2e2' },
};

const DriverDashboard = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [deliveryPeriod, setDeliveryPeriod] = useState('monthly');

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const mockOrderStatusData = [];

  const totalOrders = mockOrderStatusData.reduce((s, d) => s + d.value, 0);

  const currentDeliveryData = useMemo(() => {
    if (deliveryPeriod === 'daily') return generateDailyDeliveries();
    if (deliveryPeriod === 'monthly') return generateMonthlyDeliveries();
    return generateYearlyDeliveries();
  }, [deliveryPeriod]);

  // Rich tooltip with % change like client dashboard
  const DeliveryTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    const currentValue = payload[0].value || 0;
    const currentIndex = currentDeliveryData.findIndex(d => String(d.label) === String(label));
    const prevValue = currentIndex > 0 ? (currentDeliveryData[currentIndex - 1]?.deliveries || 0) : null;

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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 min-w-[180px]" style={{ border: `1px solid ${theme.border_color}` }}>
        <p className="text-sm font-semibold mb-2 pb-1.5" style={{ color: theme.text_primary, borderBottom: `1px solid ${theme.border_color}20` }}>{label}</p>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.button_primary }} />
              <span className="text-xs" style={{ color: theme.text_secondary }}>Deliveries</span>
            </div>
            <span className="text-sm font-bold" style={{ color: theme.text_primary }}>{currentValue}</span>
          </div>
          {changePercent !== null && (
            <div className="flex items-center justify-end gap-1">
              {changeDirection === 'up' && (
                <span className="text-[11px] font-medium text-green-600 dark:text-green-400 flex items-center gap-0.5">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2L8 6H2L5 2Z" fill="currentColor"/></svg>
                  +{changePercent}%
                </span>
              )}
              {changeDirection === 'down' && (
                <span className="text-[11px] font-medium text-red-600 dark:text-red-400 flex items-center gap-0.5">
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

  const summaryCards = [
    { label: "Today's Deliveries", value: mockStats.todayDeliveries, icon: Truck, highlight: true },
    { label: 'Pending', value: mockStats.pending, icon: Clock },
    { label: 'Total Completed', value: mockDriver.total_deliveries, icon: CheckCircle },
  ];

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      {/* Welcome Banner */}
      <div 
        className="rounded-xl p-5 sm:p-6 mb-6 text-white relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${theme.button_primary}, ${theme.button_primary}cc)` }}
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-20 w-24 h-24 bg-white/5 rounded-full translate-y-1/2" />
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">
                Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, {mockDriver.name.split(' ')[0]}!
              </h1>
              <p className="text-sm mt-1 text-white/80">
                You have {mockStats.pending} pending {mockStats.pending === 1 ? 'delivery' : 'deliveries'} today
              </p>
            </div>
            <Link
              to="/driver/deliveries"
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg text-sm font-medium hover:bg-white/30 transition-colors"
            >
              <Truck size={16} /> View All Deliveries
            </Link>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5" style={{ border: `1px solid ${theme.border_color}` }}>
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
            className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 transition-all hover:shadow-md"
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
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-5" style={{ border: `1px solid ${theme.border_color}` }}>
            <Skeleton variant="title" width="w-32" className="mb-2" />
            <Skeleton variant="text" width="w-48" className="mb-4" />
            <Skeleton variant="custom" className="h-[250px] w-full rounded-lg" />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5" style={{ border: `1px solid ${theme.border_color}` }}>
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
        {/* Delivery Bar Chart with period toggle */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-5" style={{ border: `1px solid ${theme.border_color}` }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold" style={{ color: theme.text_primary }}>{deliveryLabels[deliveryPeriod]}</h2>
              <p className="text-xs" style={{ color: theme.text_secondary }}>{deliveryDesc[deliveryPeriod]}</p>
            </div>
            {/* Period Toggle - matching client style */}
            <div className="flex rounded-lg p-1 shadow-sm" style={{ backgroundColor: '#f9fafb', border: `1px solid ${theme.border_color}` }}>
              {['daily', 'monthly', 'yearly'].map(period => (
                <button key={period} onClick={() => setDeliveryPeriod(period)}
                  className="px-3 py-1.5 text-xs font-medium rounded-md transition-all capitalize"
                  style={deliveryPeriod === period
                    ? { backgroundColor: theme.button_primary, color: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }
                    : { color: theme.text_secondary }
                  }>
                  {period}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={currentDeliveryData} barSize={deliveryPeriod === 'daily' ? 12 : deliveryPeriod === 'yearly' ? 48 : 32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: theme.text_secondary }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: theme.text_secondary }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<DeliveryTooltip />} />
              <Bar dataKey="deliveries" fill={theme.button_primary} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Delivery Status Donut */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5" style={{ border: `1px solid ${theme.border_color}` }}>
          <h2 className="text-lg font-bold" style={{ color: theme.text_primary }}>Delivery Status</h2>
          <p className="text-xs mb-4" style={{ color: theme.text_secondary }}>Breakdown of your deliveries</p>
          <div className="flex flex-col items-center">
            <div className="relative">
              <ResponsiveContainer width={200} height={180}>
                <PieChart>
                  <Pie data={mockOrderStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" stroke="none" paddingAngle={2}>
                    {mockOrderStatusData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value}`, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-2xl font-bold" style={{ color: theme.text_primary }}>{totalOrders}</p>
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

      {/* Today's Deliveries */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5" style={{ border: `1px solid ${theme.border_color}` }}>
          <div className="flex items-center justify-between mb-4">
            <Skeleton variant="title" width="w-40" />
            <Skeleton variant="text" width="w-16" />
          </div>
          <div className="columns-1 md:columns-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 rounded-xl mb-3 break-inside-avoid" style={{ border: `1px solid ${theme.border_color}` }}>
                <div className="flex items-center justify-between mb-2">
                  <Skeleton variant="text" width="w-36" />
                  <Skeleton variant="button" width="w-20" />
                </div>
                <Skeleton variant="text" width="w-48" className="mb-1" />
                <div className="flex justify-between">
                  <Skeleton variant="text" width="w-24" />
                  <Skeleton variant="title" width="w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
      <div className="bg-white dark:bg-gray-800 rounded-xl" style={{ border: `1px solid ${theme.border_color}` }}>
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: `1px solid ${theme.border_color}` }}>
          <div className="flex items-center gap-2">
            <Calendar size={18} style={{ color: theme.button_primary }} />
            <h2 className="text-base font-semibold" style={{ color: theme.text_primary }}>Today's Deliveries</h2>
          </div>
          <Link 
            to="/driver/deliveries" 
            className="text-xs font-medium flex items-center gap-1 hover:underline"
            style={{ color: theme.button_primary }}
          >
            View All <ChevronRight size={12} />
          </Link>
        </div>

        <div className="p-4 columns-1 md:columns-2 gap-3">
          {mockTodayDeliveries.map((delivery) => {
            const config = statusConfig[delivery.status];
            const priConfig = priorityColors[delivery.priority];
            const StatusIcon = config.icon;
            return (
              <div 
                key={delivery.id}
                className="p-4 rounded-xl transition-all hover:shadow-sm mb-3 break-inside-avoid"
                style={{ border: `1px solid ${theme.border_color}` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: config.bg }}>
                      <StatusIcon size={14} style={{ color: config.color }} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold" style={{ color: theme.text_primary }}>{delivery.delivery_number}</p>
                      <p className="text-[10px]" style={{ color: theme.text_secondary }}>{delivery.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span 
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ backgroundColor: priConfig.bg, color: priConfig.color }}
                    >
                      {delivery.priority}
                    </span>
                    <span 
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{ backgroundColor: config.bg, color: config.color }}
                    >
                      {delivery.status}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <MapPin size={12} style={{ color: theme.text_secondary }} />
                  <p className="text-xs" style={{ color: theme.text_primary }}>{delivery.destination}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs" style={{ color: theme.text_secondary }}>
                    {delivery.items} {delivery.items === 1 ? 'item' : 'items'} · {delivery.customer}
                  </p>
                  <p className="text-sm font-bold" style={{ color: theme.button_primary }}>
                    ₱{delivery.total.toLocaleString()}
                  </p>
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

export default DriverDashboard;
